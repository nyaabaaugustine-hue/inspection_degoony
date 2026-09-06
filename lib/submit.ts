import type { EvidencePhoto } from "@/components/PhotoEvidence";
import { getPhoto } from "@/lib/db";
import type { LocalPhoto } from "@/lib/images";

// Structural item shape accepted by submit (status may be typed or plain string —
// matches stored/outbox items as well as live form state).
export interface SubmitItem {
  status: string;
  note?: string;
  photos?: { blob: Blob; url?: string }[];
}
export type SubmitItems = Record<string, SubmitItem>;

export type SubmitResult = { ok: boolean; message: string };

export async function submitToFormspree(
  endpoint: string,
  fields: Record<string, string>,
  itemsState: SubmitItems,
  prefix: string,
  evidence: EvidencePhoto[] = [],
): Promise<SubmitResult> {
  const fd = new FormData();

  fd.set(
    "_subject",
    `${prefix === "pre" ? "PRE-TRIP" : "POST-TRIP"} — ${fields.vehicleNo || ""} — ${fields.driver || ""}`,
  );
  fd.set("formType", prefix === "pre" ? "Pre-Trip Inspection" : "Post-Trip Inspection");

  for (const [k, v] of Object.entries(fields)) {
    if (v) fd.set(k, v);
  }

  const lines: string[] = [];
  let photoIndex = 0;
  for (const [id, item] of Object.entries(itemsState)) {
    const photos = item.photos || [];
    if (!item.status && !item.note && photos.length === 0) continue;
    lines.push(`${id}: ${item.status || "—"}${item.note ? ` — ${item.note}` : ""}`);
    photos.forEach((photo, pi) => {
      photoIndex++;
      if (photo?.blob) {
        fd.append(`${prefix}-photo-${photoIndex}`, photo.blob, `${prefix}_${id}_${pi + 1}.jpg`);
      }
    });
  }
  if (lines.length) fd.set(`${prefix}_items`, lines.join("\n"));

  if (evidence.length) {
    fd.set(`${prefix}_evidence`, evidence.map((ev) => ev.caption).join("\n"));
    let evIndex = 0;
    for (const ev of evidence) {
      evIndex++;
      if (ev.photo?.blob) {
        fd.append(`${prefix}-evidence-${evIndex}`, ev.photo.blob, `${prefix}_evidence_${evIndex}.jpg`);
      }
    }
    fd.set(`${prefix}_evidence_captions`, JSON.stringify(evidence.map((ev) => ev.caption)));
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: fd,
    });
    if (!res.ok) {
      const js = (await res.json().catch(() => null)) as { errors?: { message: string }[] } | null;
      const msg = js?.errors?.map((e) => e.message).join(", ");
      return { ok: false, message: msg || `Formspree returned ${res.status}` };
    }
    return { ok: true, message: "Inspection submitted. Check your email for the evidence." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Network error" };
  }
}

// Full backup (in-form button): Blobs → base64 data URLs so the JSON file is
// self-contained with photos.
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Types for the JSON-serializable backup file (not SubmitItem/EvidencePhoto).
type BackupItem = { status: string; note: string; photos: string[] };
type BackupEvidence = { caption: string; dataUrl: string };
type BackupShape = {
  prefix: string;
  queuedAt: string;
  fields: Record<string, string>;
  items: Record<string, BackupItem>;
  evidence: BackupEvidence[];
};

async function serializeForBackup(
  items: SubmitItems,
  evidence: EvidencePhoto[],
): Promise<BackupShape> {
  const serializedItems: Record<string, BackupItem> = {};
  for (const [id, it] of Object.entries(items)) {
    const photos = (it.photos || []).filter((p) => p?.blob);
    serializedItems[id] = {
      status: it.status,
      note: it.note ?? "",
      photos: await Promise.all(photos.map((p) => blobToDataUrl(p.blob!))),
    };
  }
  const serializedEvidence = await Promise.all(
    evidence.map(async (ev) => ({
      caption: ev.caption,
      dataUrl: ev.photo?.blob ? await blobToDataUrl(ev.photo.blob) : "",
    })),
  );
  return { prefix: "", queuedAt: "", fields: {}, items: serializedItems, evidence: serializedEvidence };
}

export async function downloadBackup(
  payload: { prefix: string; queuedAt: string; fields: Record<string, string>; items: SubmitItems; evidence: EvidencePhoto[] },
  filename = "inspection.json",
): Promise<void> {
  const serialized = await serializeForBackup(payload.items, payload.evidence);
  serialized.prefix = payload.prefix;
  serialized.queuedAt = payload.queuedAt;
  serialized.fields = payload.fields;
  const blob = new Blob([JSON.stringify(serialized, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Rehydrate stored photo IDs → full LocalPhoto blobs (used by Outbox to
// resubmit an entry after a reload).
export type ResolvedItemPhoto = { blob: Blob; url?: string };
export type ResolvedItem = { status: string; note: string; photos: ResolvedItemPhoto[] };
export type ResolvedEvidence = { caption: string; photo: LocalPhoto };

export async function rehydrateEntryPhotos(
  items: Record<string, { status: string; note: string; photos: string[] }>,
  evidence: { caption: string; id: string }[],
): Promise<{ items: SubmitItems; resolvedEvidence: ResolvedEvidence[] }> {
  const resolvedItems: SubmitItems = {};
  for (const [id, it] of Object.entries(items)) {
    const photos = (await Promise.all(
      (it.photos || []).map(async (pid) => {
        const blob = await getPhoto(pid);
        return blob ? { blob } : null;
      }),
    )).filter(Boolean) as ResolvedItemPhoto[];
    resolvedItems[id] = { status: it.status, note: it.note ?? "", photos };
  }
  const resolvedEvidence = (await Promise.all(
    evidence.map(async (ev) => {
      const blob = await getPhoto(ev.id);
      return blob ? { caption: ev.caption, photo: { id: ev.id, blob, url: "" } } : null;
    }),
  )).filter(Boolean) as ResolvedEvidence[];
  return { items: resolvedItems, resolvedEvidence };
}
