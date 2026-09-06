"use client";

import { useCallback, useEffect, useState } from "react";
import type { ItemDef, ItemState } from "@/lib/items";
import type { EvidencePhoto } from "@/components/PhotoEvidence";
import { submitToFormspree, downloadBackup } from "@/lib/submit";
import { FORMSPREE_ENDPOINT } from "@/lib/config";
import { saveDraft, draftKey, pushOutbox, rememberDraftKey, loadLatestDraft, clearLatestDraft } from "@/lib/store";
import type { QueuedSubmission } from "@/lib/store";

export type ValidationEntry = { field: keyof FieldsState; label: string; rule: (v: string) => boolean };

type BaseFields = Record<string, string>;

export interface FieldsState {
  date: string;
  driver: string;
  vehicleNo: string;
  [k: string]: string;
}

interface Options {
  prefix: string;
  defaultFields: BaseFields;
  validation: ValidationEntry[];
  extraFields?: (fields: BaseFields) => Record<string, string>;
}

function emptyItems(items: ItemDef[]): Record<string, ItemState> {
  const s: Record<string, ItemState> = {};
  items.forEach((it) => (s[it.id] = { status: "", note: "", photos: [] }));
  return s;
}

export function useInspectionForm({ prefix, defaultFields, validation, extraFields }: Options) {
  const [fields, setFields] = useState<BaseFields>(() => defaultFields);
  const [items, setItems] = useState<Record<string, ItemState>>(() => emptyItems([]));
  const [evidence, setEvidence] = useState<EvidencePhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [justQueued, setJustQueued] = useState(false);

  const setField = useCallback((k: string, v: string) => {
    setFields((p) => ({ ...p, [k]: v }));
  }, []);

  const setItem = useCallback((id: string, patch: Partial<ItemState>) => {
    setItems((p) => ({ ...p, [id]: { ...(p[id] || { status: "", note: "", photos: [] }), ...patch } }));
  }, []);

  const setEvidenceList = useCallback((list: EvidencePhoto[]) => setEvidence(list), []);

  const removeEvidence = useCallback((i: number) => setEvidence((p) => p.filter((_, idx) => idx !== i)), []);

  // Draft autosave (debounced).
  useEffect(() => {
    const t = setTimeout(() => {
      const key = draftKey(prefix, fields.vehicleNo);
      const entry: QueuedSubmission = {
        id: "draft",
        queuedAt: new Date().toISOString(),
        prefix,
        fields,
        items,
        evidence,
      };
      saveDraft(key, entry);
      rememberDraftKey(prefix, key);
    }, 600);
    return () => clearTimeout(t);
  }, [fields, items, evidence, prefix]);

  const restore = useCallback(
    (itemDefs: ItemDef[]) => {
      const { key, value: draft } = loadLatestDraft<QueuedSubmission>(prefix);
      if (draft) {
        const base = emptyItems(itemDefs);
        for (const id of itemDefs.map((d) => d.id)) {
          if (draft.items[id]) {
            const raw = draft.items[id].status;
            const status: ItemState["status"] =
              raw === "OK" || raw === "DEFECT" || raw === "N/A" || raw === "" ? raw : "";
            base[id] = {
              status,
              note: draft.items[id].note ?? "",
              photos: draft.items[id].photos ?? [],
            };
          }
        }
        setItems(base);
        if (draft.fields) setFields(draft.fields);
        if (draft.evidence) setEvidence(draft.evidence);
      } else {
        setItems(emptyItems(itemDefs));
      }
      return { draft, key };
    },
    [prefix],
  );

  const validate = useCallback((): string | null => {
    for (const entry of validation) {
      const val = fields[entry.field] || "";
      if (!entry.rule(val)) return `${entry.label} is required.`;
    }
    return null;
  }, [fields, validation]);

  const buildPayload = useCallback(
    (): QueuedSubmission => ({
      id: "", // assigned when queued
      queuedAt: new Date().toISOString(),
      prefix,
      fields: { ...fields, ...(extraFields ? extraFields(fields) : {}) },
      items,
      evidence,
    }),
    [fields, items, evidence, prefix, extraFields],
  );

  const submit = useCallback(async (): Promise<boolean> => {
    const errMsg = validate();
    if (errMsg) {
      setError(errMsg);
      return false;
    }
    setError(null);
    setBusy(true);
    setJustQueued(false);

    const payload = buildPayload();
    const result = await submitToFormspree(FORMSPREE_ENDPOINT, payload.fields, payload.items, prefix, payload.evidence);

    if (result.ok) {
      clearLatestDraft(prefix);
      setBusy(false);
      return true;
    }

    // Offline/failure → queue for retry and offer backup, never lose data.
    pushOutbox(payload);
    setJustQueued(true);
    setBusy(false);
    setError(`Network/Formspree error — ${result.message}. Saved to outbox; you can retry.`);
    return false;
  }, [validate, buildPayload, prefix]);

  const download = useCallback(
    (filename?: string) => {
      const payload = buildPayload();
      downloadBackup(payload, filename || `${prefix}_${fields.vehicleNo || "vehicle"}_${fields.date || ""}.json`);
    },
    [buildPayload, prefix, fields],
  );

  return {
    fields,
    items,
    evidence,
    error,
    busy,
    justQueued,
    setJustQueued,
    setField,
    setItem,
    setEvidence: setEvidenceList,
    removeEvidence,
    restore,
    submit,
    download,
    setError,
  };
}
