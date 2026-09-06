"use client";

import { useState } from "react";
import { addValidatedPhoto, removeSavedPhoto, sharePhotos, savePhoto, MAX_PHOTOS_PER_FORM } from "@/lib/images";
import type { LocalPhoto } from "@/lib/images";

export type EvidencePhoto = { caption: string; photo: LocalPhoto };

type Props = {
  suggested?: string[];
  photos: EvidencePhoto[];
  onChange: (photos: EvidencePhoto[]) => void;
  onRemove: (index: number) => void;
};

export function PhotoEvidence({ suggested = [], photos, onChange, onRemove }: Props) {
  const [captionDraft, setCaptionDraft] = useState("");
  const [photoError, setPhotoError] = useState<string | null>(null);

  const showPhotoError = (msg: string) => {
    setPhotoError(msg);
    window.setTimeout(() => setPhotoError(null), 4000);
  };

  const handleFile = async (file: File) => {
    const res = await addValidatedPhoto(file, photos.length);
    if (!res.ok) {
      if (res.error === "too-many") showPhotoError("Photo limit reached (max 12).");
      else if (res.error === "too-large") showPhotoError("Photo is too large — choose a smaller image.");
      else showPhotoError("Could not read that image.");
      return;
    }
    if (!res.photo) return;
    onChange([...photos, { caption: captionDraft || "General view", photo: res.photo }]);
    setCaptionDraft("");
  };

  const remove = async (index: number) => {
    const target = photos[index];
    if (target) await removeSavedPhoto(target.photo);
    onRemove(index);
  };

  const share = async (source: EvidencePhoto) => {
    const r = await sharePhotos([{ blob: source.photo.blob, name: `evergreen_${source.photo.id}.jpg` }]);
    if (r === "unsupported") savePhoto(source.photo.blob, `evergreen_${source.photo.id}.jpg`);
  };

  return (
    <>
      <div className="evidence-list">
        {photos.map((p, i) => (
          <div className="evidence-item" key={i}>
            <img src={p.photo.url} alt={`evidence-${i}`} className="evidence-img" />
            <div className="evidence-caption">
              <span>{p.caption}</span>
            </div>
            <div className="evidence-actions">
              <button type="button" className="evidence-btn" onClick={() => share(p)}>
                Share
              </button>
              <button type="button" className="evidence-remove" onClick={() => remove(i)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {photoError && <div className="photo-error">{photoError}</div>}

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