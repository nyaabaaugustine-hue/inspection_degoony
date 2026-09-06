// Image handling: downscale + validate photos, persist them on the device via
// IndexedDB, preview with object URLs, submit the Blob straight into FormData,
// and share/save them (e.g. WhatsApp) via the Web Share API. No base64 in the
// live pipeline — only the optional JSON backup file encodes photos.

import { putPhoto, getPhoto, deletePhoto, prunePhotos } from "@/lib/db";

export const MAX_PHOTO_DIM = 1280; // longest side, px
export const MAX_PHOTO_QUALITY = 0.8; // JPEG quality
export const MAX_PHOTOS_PER_FORM = 12;

export type PhotoError = "too-large" | "too-many" | "read-failed" | null;

// A device-persisted photo: blob is stored in IndexedDB; url is an ephemeral
// object URL for <img> preview.
export type LocalPhoto = {
  id: string;
  blob: Blob;
  url: string;
};

export interface PhotoStatus {
  ok: boolean;
  photo?: LocalPhoto;
  error?: PhotoError;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("load-failed"));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("encode-failed"))),
      "image/jpeg",
      MAX_PHOTO_QUALITY,
    );
  });
}

export const supported = typeof indexedDB !== "undefined";

// Downscale and re-encode a file as a JPEG Blob, persist it in IndexedDB so it
// survives reload on the device, and return a preview object URL.
export async function addValidatedPhoto(
  file: File,
  currentCount: number,
): Promise<PhotoStatus> {
  if (currentCount >= MAX_PHOTOS_PER_FORM) {
    return { ok: false, error: "too-many" };
  }
  if (file.size > 12 * 1024 * 1024) {
    return { ok: false, error: "too-large" };
  }

  const srcUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(srcUrl);
    const scale = Math.min(1, MAX_PHOTO_DIM / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, error: "read-failed" };
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await canvasToBlob(canvas);
    const id = await putPhoto(blob);
    return { ok: true, photo: { id, blob, url: URL.createObjectURL(blob) } };
  } catch {
    return { ok: false, error: "read-failed" };
  } finally {
    URL.revokeObjectURL(srcUrl);
  }
}

// Load a previously-saved photo blob back from IndexedDB (used when restoring
// a draft or rehydrating an outbox entry after a reload).
export async function loadSavedPhoto(id: string): Promise<LocalPhoto | null> {
  try {
    const blob = await getPhoto(id);
    if (!blob) return null;
    return { id, blob, url: URL.createObjectURL(blob) };
  } catch {
    return null;
  }
}

// Remove a photo from IndexedDB (permanent on-device delete).
export async function removeSavedPhoto(photo: LocalPhoto): Promise<boolean> {
  try {
    URL.revokeObjectURL(photo.url);
  } catch {
    /* ignore */
  }
  return deletePhoto(photo.id).then(
    () => true,
    () => false,
  );
}

// Garbage-collect IndexedDB blobs not referenced by any draft/outbox.
export async function gcPhotos(keepIds: string[]): Promise<void> {
  try {
    await prunePhotos(keepIds);
  } catch {
    /* ignore */
  }
}

export type ShareResult = "shared" | "cancelled" | "unsupported";

// Share one or more photos through the system share sheet (WhatsApp etc.).
export async function sharePhotos(
  photos: { blob: Blob; name: string }[],
): Promise<ShareResult> {
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  const files = photos.map(
    (p) => new File([p.blob], p.name, { type: p.blob.type || "image/jpeg" }),
  );
  if (!nav.canShare || !nav.canShare({ files })) return "unsupported";
  try {
    await navigator.share({ files });
    return "shared";
  } catch (err) {
    return err instanceof DOMException && err.name === "AbortError"
      ? "cancelled"
      : "unsupported";
  }
}

// Fallback for browsers without file sharing: download the photo to the device.
export function savePhoto(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}