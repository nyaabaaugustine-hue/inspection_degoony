"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import HomeLink from "@/components/HomeLink";
import { INSPECTION_TABLE_ID, DRIVER_TABLE_ID } from "@/lib/config";

type Rec = Record<string, unknown>;
type Tab = "inspection" | "driver";

function asText(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t || null;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    const parts = v
      .map(asText)
      .filter((x): x is string => !!x)
      .join(", ");
    return parts || null;
  }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("value" in o) return asText(o.value);
    if ("text" in o) return asText(o.text);
    if ("url" in o) return asText(o.url);
  }
  return null;
}

function photosOf(v: unknown): { url: string; name?: string }[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (x): x is Record<string, unknown> => !!x && typeof x === "object" && typeof (x as Record<string, unknown>).url === "string",
    )
    .map((x) => ({
      url: String(x.url),
      name: typeof x.name === "string" ? x.name : undefined,
    }));
}

function humanLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const API = (tableId: number) => `/api/rows?table=${tableId}`;

async function fetchRows(tableId: number): Promise<Rec[]> {
  const res = await fetch(API(tableId));
  if (!res.ok) throw new Error(`Server ${res.status}`);
  const js = (await res.json()) as { results?: Rec[]; error?: string };
  if (js.error) throw new Error(js.error);
  return (js.results || []).sort((a, b) => {
    const na = typeof a.id === "number" ? a.id : Number.NEGATIVE_INFINITY;
    const nb = typeof b.id === "number" ? b.id : Number.NEGATIVE_INFINITY;
    return nb - na;
  });
}

type FieldDef = {
  key: keyof Record<string, unknown>;
  type: "text" | "textarea" | "date" | "select";
  options?: string[];
};

const INSP_FIELDS: FieldDef[] = [
  { key: "driver_name", type: "text" },
  { key: "form_type", type: "select", options: ["Pre-Trip Inspection", "Post-Trip Inspection"] },
  { key: "date", type: "date" },
  { key: "start_time", type: "text" },
  { key: "vehicle_no", type: "text" },
  { key: "trailer_no", type: "text" },
  { key: "odometer", type: "text" },
  { key: "inspector", type: "text" },
  { key: "vehicle_type", type: "text" },
  { key: "existing_damage", type: "textarea" },
  { key: "items_report", type: "textarea" },
  { key: "evidence_captions", type: "textarea" },
  { key: "driver_cert", type: "text" },
  {
    key: "supervisor_decision",
    type: "select",
    options: ["Fit for operation", "Restricted — see instructions", "Do not deploy / out of service"],
  },
  { key: "authorizer_name", type: "text" },
  { key: "email_subject", type: "text" },
];

const DRV_FIELDS: FieldDef[] = [
  { key: "full_name", type: "text" },
  { key: "date_of_birth", type: "date" },
  { key: "ghana_card_no", type: "text" },
  { key: "residential_address", type: "text" },
  { key: "phone_number", type: "text" },
  { key: "emergency_contact", type: "text" },
  { key: "marital_status", type: "select", options: ["Single", "Married", "Divorced", "Widowed"] },
  { key: "drivers_license_no", type: "text" },
  { key: "license_class", type: "select", options: ["A", "B", "D", "E", "Other"] },
  { key: "valid_license", type: "select", options: ["Yes", "No"] },
  { key: "years_experience", type: "text" },
  { key: "previous_employer", type: "text" },
  { key: "gps_directions", type: "select", options: ["Yes", "No"] },
  { key: "sales_targets", type: "select", options: ["Yes", "No"] },
  { key: "guarantor_1_name", type: "text" },
  { key: "guarantor_1_relationship", type: "text" },
  { key: "guarantor_1_phone", type: "text" },
  { key: "guarantor_1_occupation", type: "text" },
  { key: "guarantor_2_name", type: "text" },
  { key: "guarantor_2_relationship", type: "text" },
  { key: "guarantor_2_phone", type: "text" },
  { key: "guarantor_2_occupation", type: "text" },
];

const FIELDS_FOR: Record<Tab, FieldDef[]> = { inspection: INSP_FIELDS, driver: DRV_FIELDS };

export default function RecordsPage() {
  const [tab, setTab] = useState<Tab>("inspection");
  const [data, setData] = useState<{ inspection: Rec[]; driver: Rec[] }>({
    inspection: [],
    driver: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ tab: Tab; id: number } | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [inspection, driver] = await Promise.all([
        fetchRows(INSPECTION_TABLE_ID),
        fetchRows(DRIVER_TABLE_ID),
      ]);
      setData({ inspection, driver });
    } catch (e) {
      setError("Could not load records — check connection or Baserow access.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (row: Rec) => {
    const id = typeof row.id === "number" ? row.id : Number(row.id);
    if (!Number.isFinite(id)) return;
    const fields = FIELDS_FOR[tab];
    const values: Record<string, string> = {};
    for (const f of fields) values[f.key as string] = asText(row[f.key]) ?? "";
    setEditValues(values);
    setEditError(null);
    setEditing({ tab, id });
  };

  const closeEdit = () => {
    setEditing(null);
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setEditBusy(true);
    setEditError(null);
    try {
      const tableId = editing.tab === "inspection" ? INSPECTION_TABLE_ID : DRIVER_TABLE_ID;
      const row: Record<string, unknown> = {};
      for (const f of FIELDS_FOR[editing.tab]) {
        const raw = (editValues[f.key as string] ?? "").trim();
        if (f.type === "select") {
          // Baserow rejects unknown/empty values for single-select fields —
          // send only a valid option, otherwise omit the field entirely.
          if (raw !== "" && (f.options || []).includes(raw)) row[f.key as string] = raw;
        } else if (raw === "") {
          // "Put dash to all empty place" — only for free text; empty date
          // fields are omitted (Baserow rejects empty date strings).
          if (f.type !== "date") row[f.key as string] = "-";
        } else {
          row[f.key as string] = raw;
        }
      }
      const res = await fetch("/api/rows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, rowId: editing.id, row }),
      });
      const js = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !js?.ok) {
        setEditError(js?.message || `Server ${res.status}`);
        return;
      }
      const id = editing.id;
      closeEdit();
      await load();
      console.log(`record ${id} updated`);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Could not save changes.");
    } finally {
      setEditBusy(false);
    }
  };

  const rows = data[tab];

  return (
    <>
      <header className="top">
        <div className="header-row">
          <div className="brand">
            <h1>Evergreen Logistics</h1>
            <span>Saved submissions</span>
          </div>
          <HomeLink />
        </div>
      </header>
      <main>
        <div className="card">
          <div className="records-head">
            <h2>
              Submission records
              <small>Saved to the DEGOONY database — shown here for review.</small>
            </h2>
            <button type="button" className="btn btn-ghost btn-small refresh-btn" onClick={load} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>

          <div className="tabs">
            <button
              type="button"
              className={`tab${tab === "inspection" ? " active" : ""}`}
              onClick={() => setTab("inspection")}
            >
              Inspections
              <span className="tab-count">{data.inspection.length}</span>
            </button>
            <button
              type="button"
              className={`tab${tab === "driver" ? " active" : ""}`}
              onClick={() => setTab("driver")}
            >
              Drivers
              <span className="tab-count">{data.driver.length}</span>
            </button>
          </div>

          {error && <div className="photo-error">{error}</div>}
          {!error && rows.length === 0 && (
            <div className="empty-state">
              <p>No {tab === "inspection" ? "inspection" : "driver"} submissions yet.</p>
              <p>Submitting a form here will show it in this list.</p>
            </div>
          )}

          {rows.map((row) => {
            const photos = photosOf(row.photos);
            const entries = Object.entries(row).filter(
              ([k, v]) => !["id", "created_on", "updated_on", "photos"].includes(k) && asText(v) !== null,
            );
            const title =
              asText(row.driver_name) ||
              asText(row.full_name) ||
              `${tab === "inspection" ? "Inspection" : "Driver"} record`;
            const kind = asText(row.form_type);
            return (
              <div className="record-card" key={String(row.id ?? Math.random())}>
                <div className="record-title">
                  <span className="record-name">{title}</span>
                  {kind && <span className="tag tag-unchanged">{kind}</span>}
                </div>
                <div className="record-meta">
                  {asText(row.vehicle_no) && <span className="record-chip">{asText(row.vehicle_no)}</span>}
                  {asText(row.created_on) && (
                    <span className="record-chip record-date">
                      {String(asText(row.created_on)).slice(0, 16).replace("T", " ")}
                    </span>
                  )}
                  {row.id != null && <span className="record-chip">#id {String(row.id)}</span>}
                  <button
                    type="button"
                    className="btn btn-ghost btn-small record-edit"
                    disabled={editBusy}
                    onClick={() => openEdit(row)}
                  >
                    ✎ Edit
                  </button>
                </div>
                <div className="record-grid">
                  {entries.map(([k, v]) => {
                    const t = asText(v);
                    if (!t) return null;
                    return (
                      <div className="record-field" key={k}>
                        <span className="record-label">{humanLabel(k)}</span>
                        <span className="record-value">{t}</span>
                      </div>
                    );
                  })}
                </div>
                {photos.length > 0 && (
                  <div className="record-photos">
                    {photos.map((ph, i) => (
                      <a key={i} href={ph.url} target="_blank" rel="noreferrer">
                        <img src={ph.url} alt={ph.name || `photo-${i}`} className="record-photo" />
                      </a>
                    ))}
                  </div>
                )}
                {editing && editing.tab === tab && editing.id === row.id && (
                  <div className="edit-panel">
                    <h3>
                      Edit {tab === "inspection" ? "inspection" : "driver"} record
                    </h3>
                    {editError && <div className="photo-error">{editError}</div>}
                    <div className="row2">
                      {FIELDS_FOR[tab].map((f) => (
                        <div className="field" key={f.key as string}>
                          <label>{humanLabel(f.key as string)}</label>
                          {f.type === "select" ? (
                            <select
                              value={editValues[f.key as string] ?? ""}
                              onChange={(e) =>
                                setEditValues((v) => ({ ...v, [f.key as string]: e.target.value }))
                              }
                            >
                              <option value="">-</option>
                              {(f.options || []).map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : f.type === "textarea" ? (
                            <textarea
                              value={editValues[f.key as string] ?? ""}
                              onChange={(e) =>
                                setEditValues((v) => ({ ...v, [f.key as string]: e.target.value }))
                              }
                            />
                          ) : (
                            <input
                              type={f.type === "date" ? "date" : "text"}
                              value={editValues[f.key as string] ?? ""}
                              onChange={(e) =>
                                setEditValues((v) => ({ ...v, [f.key as string]: e.target.value }))
                              }
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="edit-actions">
                      <button type="button" className="btn btn-ghost" onClick={closeEdit} disabled={editBusy}>
                        Cancel
                      </button>
                      <button type="button" className="btn btn-primary" onClick={saveEdit} disabled={editBusy}>
                        {editBusy ? "Saving…" : "Save changes"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}