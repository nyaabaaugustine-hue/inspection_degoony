"use client";

import type { ItemDef, ItemState, Status } from "@/lib/items";
import { addValidatedPhoto, MAX_PHOTOS_PER_FORM } from "@/lib/images";

type Props = {
  items: ItemDef[];
  okLabel?: string;
  defectLabel?: string;
  showPhotos?: boolean;
  state: Record<string, ItemState>;
  onChange: (id: string, patch: Partial<ItemState>) => void;
};

export function InspectionList({
  items,
  okLabel = "OK",
  defectLabel = "Defect",
  showPhotos = false,
  state,
  onChange,
}: Props) {
  const setStatus = (id: string, status: Status) => onChange(id, { status });
  const setNote = (id: string, note: string) => onChange(id, { note });

  const handleFile = async (id: string, file: File) => {
    const current = (state[id]?.photos || []).length;
    const res = await addValidatedPhoto(file, current);
    if (!res.ok) return;
    if (res.dataUrl) onChange(id, { photos: [...(state[id]?.photos || []), res.dataUrl] });
  };

  const removePhoto = (id: string, idx: number) =>
    onChange(id, { photos: (state[id]?.photos || []).filter((_, i) => i !== idx) });

  const counts = {
    ok: Object.values(state).filter((v) => v.status === "OK").length,
    defect: Object.values(state).filter((v) => v.status === "DEFECT").length,
  };

  return (
    <>
      <div className="summary-bar">
        <span>
          <span className="dot" style={{ background: "var(--ok)" }} />
          <b>{counts.ok}</b> {okLabel}
        </span>
        <span>
          <span className="dot" style={{ background: "var(--defect)" }} />
          <b>{counts.defect}</b> {defectLabel}
        </span>
      </div>

      {items.map((it, index) => {
        const st = state[it.id] || { status: "", note: "", photos: [] };
        return (
          <div className="item" key={it.id}>
            <div className="item-label">
              {index + 1}. {it.label}
            </div>
            <div className="pill-group">
              {(["OK", "DEFECT", "N/A"] as Status[]).map((status) => {
                const cls = status === "OK" ? "ok" : status === "DEFECT" ? "defect" : "na";
                const label = status === "DEFECT" ? defectLabel : status;
                return (
                  <button
                    type="button"
                    key={status}
                    className={`pill ${cls}${st.status === status ? " active" : ""}`}
                    onClick={() => setStatus(it.id, status)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className={`item-note${st.status === "DEFECT" ? " show" : ""}`}>
              <textarea
                placeholder="Describe the defect / condition"
                value={st.note}
                onChange={(e) => setNote(it.id, e.target.value)}
              />
            </div>
            {showPhotos && (
              <div className="photo-row">
                {st.photos.map((p, i) => (
                  <div className="thumb-wrap" key={i}>
                    <img src={p} alt={`photo-${it.id}-${i}`} className="thumb" />
                    <button type="button" className="thumb-remove" onClick={() => removePhoto(it.id, i)}>
                      ×
                    </button>
                  </div>
                ))}
                {st.photos.length < MAX_PHOTOS_PER_FORM && (
                  <label className="add-photo" title="Add photo">
                    +
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(it.id, f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
