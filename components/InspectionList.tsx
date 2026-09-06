"use client";

import { useState } from "react";
import type { ItemDef, ItemState, Status } from "@/lib/items";
import { addValidatedPhoto, removeSavedPhoto, sharePhotos, savePhoto, MAX_PHOTOS_PER_FORM } from "@/lib/images";
import type { LocalPhoto } from "@/lib/images";

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
  const [photoError, setPhotoError] = useState<string | null>(null);

  const showPhotoError = (msg: string) => {
    setPhotoError(msg);
    window.setTimeout(() => setPhotoError(null), 4000);
  };

  const handleFile = async (id: string, file: File) => {
    const current = (state[id]?.photos || []).length;
    const res = await addValidatedPhoto(file, current);
    if (!res.ok) {
      if (res.error === "too-many") showPhotoError("Photo limit reached (max 12).");
      else if (res.error === "too-large") showPhotoError("Photo is too large — choose a smaller image.");
      else showPhotoError("Could not read that image.");
      return;
    }
    if (res.photo) onChange(id, { photos: [...(state[id]?.photos || []), res.photo] });
  };

  const removePhoto = async (id: string, idx: number) => {
    const target = (state[id]?.photos || [])[idx];
    if (target) await removeSavedPhoto(target);
    onChange(id, { photos: (state[id]?.photos || []).filter((_, i) => i !== idx) });
  };

  const sharePhoto = async (photo: LocalPhoto) => {
    const r = await sharePhotos([{ blob: photo.blob, name: `evergreen_${photo.id}.jpg` }]);
    if (r === "unsupported") savePhoto(photo.blob, `evergreen_${photo.id}.jpg`);
  };

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

      {photoError && <div className="photo-error">{photoError}</div>}

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
                    <img src={p.url} alt={`photo-${it.id}-${i}`} className="thumb" />
                    <button type="button" className="thumb-remove" onClick={() => removePhoto(it.id, i)}>
                      ×
                    </button>
                    <button type="button" className="thumb-share" onClick={() => sharePhoto(p)}>
                      ⤴
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
