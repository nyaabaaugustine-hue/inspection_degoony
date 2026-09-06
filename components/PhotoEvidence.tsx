"use client";

import { useState } from "react";
import { addValidatedPhoto, MAX_PHOTOS_PER_FORM } from "@/lib/images";

export type EvidencePhoto = { caption: string; dataUrl: string };

type Props = {
  suggested?: string[];
  photos: EvidencePhoto[];
  onChange: (photos: EvidencePhoto[]) => void;
  onRemove: (index: number) => void;
};

export function PhotoEvidence({ suggested = [], photos, onChange, onRemove }: Props) {
  const [captionDraft, setCaptionDraft] = useState("");

  const handleFile = async (file: File) => {
    const res = await addValidatedPhoto(file, photos.length);
    if (!res.ok || !res.dataUrl) return;
    onChange([...photos, { caption: captionDraft || "General view", dataUrl: res.dataUrl }]);
    setCaptionDraft("");
  };

  return (
    <>
      <div className="evidence-list">
        {photos.map((p, i) => (
          <div className="evidence-item" key={i}>
            <img src={p.dataUrl} alt={`evidence-${i}`} className="evidence-img" />
            <div className="evidence-caption">
              <span>{p.caption}</span>
              <button type="button" className="evidence-remove" onClick={() => onRemove(i)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {photos.length < MAX_PHOTOS_PER_FORM && (
        <div className="evidence-add">
          <div className="evidence-caption-field">
            {suggested.length > 0 && (
              <select value={captionDraft} onChange={(e) => setCaptionDraft(e.target.value)}>
                <option value="">Select or type a label…</option>
                {suggested.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
            <input
              type="text"
              placeholder="Caption (e.g. Front view, Odometer, Driver side)"
              value={captionDraft}
              onChange={(e) => setCaptionDraft(e.target.value)}
            />
          </div>
          <label className="add-photo add-photo-wide" title="Add evidence photo">
            + Add photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}
    </>
  );
}
