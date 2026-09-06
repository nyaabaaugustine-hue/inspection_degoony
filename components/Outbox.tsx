"use client";

import { useState } from "react";
import { getOutbox, removeOutbox } from "@/lib/store";
import type { QueuedSubmission } from "@/lib/store";
import { submitToFormspree, rehydrateEntryPhotos } from "@/lib/submit";
import { FORMSPREE_ENDPOINT } from "@/lib/config";

export default function Outbox() {
  const [entries, setEntries] = useState<QueuedSubmission[]>(() => getOutbox());
  const [state, setState] = useState<Record<string, "idle" | "busy" | "done" | "fail">>({});
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (entries.length === 0) return null;

  const resubmit = async (entry: QueuedSubmission) => {
    setState((s) => ({ ...s, [entry.id]: "busy" }));
    const { items, resolvedEvidence } = await rehydrateEntryPhotos(entry.items, entry.evidence);
    const result = await submitToFormspree(FORMSPREE_ENDPOINT, entry.fields, items, entry.prefix, resolvedEvidence);
    if (result.ok) {
      setEntries(removeOutbox(entry.id));
      setState((s) => ({ ...s, [entry.id]: "done" }));
      setStatusMsg("Submission sent.");
    } else {
      setState((s) => ({ ...s, [entry.id]: "fail" }));
      setStatusMsg(`Still failing: ${result.message}. Try again when online.`);
    }
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const remove = (id: string) => {
    setEntries(removeOutbox(id));
  };

  const downloadTextBackup = (entry: QueuedSubmission) => {
    const blob = new Blob([JSON.stringify(entry, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entry.prefix}_${entry.fields.vehicleNo || "vehicle"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card outbox">
      <h2>
        Pending submissions<small>Saved locally — photos stay on your device in IndexedDB and are included when the queued submission is retried.</small>
      </h2>
      {statusMsg && <div className="outbox-msg">{statusMsg}</div>}
      {entries.map((e) => (
        <div className="outbox-item" key={e.id}>
          <div className="outbox-meta">
            <span className={`pill-mini ${e.prefix === "pre" ? "pre" : "post"}`}>
              {e.prefix === "pre" ? "PRE" : "POST"}
            </span>
            <b>{e.fields.vehicleNo || "—"}</b>
            <span>{e.fields.driver || ""}</span>
            <small>{new Date(e.queuedAt).toLocaleString()}</small>
          </div>
          <div className="outbox-actions">
            <button className="btn btn-small" disabled={state[e.id] === "busy"} onClick={() => resubmit(e)}>
              {state[e.id] === "busy" ? "Sending…" : "Retry"}
            </button>
            <button className="btn btn-small" onClick={() => downloadTextBackup(e)}>
              Backup
            </button>
            <button className="btn btn-small btn-danger" onClick={() => remove(e.id)}>
              Discard
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}