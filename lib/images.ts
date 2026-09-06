// Image handling: downscale + validate evidence photos before they are stored
// or submitted, to keep payloads small and within Formspree attachment limits.

export const MAX_PHOTO_DIM = 1280; // longest side, px
export const MAX_PHOTO_QUALITY = 0.8; // JPEG quality
export const MAX_PHOTOS_PER_FORM = 12;

export type PhotoError = "too-large" | "too-many" | null;

export interface PhotoStatus {
  ok: boolean;
  dataUrl?: string;
  error?: PhotoError;
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

// Downscale and re-encode an image as JPEG. Returns a data URL.
export async function downscaleImage(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_PHOTO_DIM / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", MAX_PHOTO_QUALITY);
}

// Validate a chosen file and, if valid, return a downscaled data URL.
export async function addValidatedPhoto(
  file: File,
  currentCount: number,
): Promise<PhotoStatus> {
  if (currentCount >= MAX_PHOTOS_PER_FORM) {
    return { ok: false, error: "too-many" };
  }
  const raw = await readFile(file);
  if (raw.length > 12 * 1024 * 1024) {
    return { ok: false, error: "too-large" };
  }
  const dataUrl = await downscaleImage(raw);
  return { ok: true, dataUrl };
}
