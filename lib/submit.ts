import type { EvidencePhoto } from "@/components/PhotoEvidence";

// Structural item shape accepted by submit (status may be typed or plain string —
// matches stored/outbox items as well as live form state).
export interface SubmitItem {
  status: string;
  note?: string;
  photos?: string[];
}
export type SubmitItems = Record<string, SubmitItem>;

function dataUrlToFile(dataUrl: string, name: string): File {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);/)?.[1] || "image/jpeg";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name, { type: mime });
}

export type SubmitResult = { ok: boolean; message: string };

export async function submitToFormspree(
  endpoint: string,
  fields: Record<string, string>,
  itemsState: SubmitItems,
  prefix: string,
  evidence: EvidencePhoto[] = [],
): Promise<SubmitResult> {
  const fd = new FormData();

  // Fancy-field prefix for Formspree (organises the submission).
  fd.set("_subject", `${prefix === "pre" ? "PRE-TRIP" : "POST-TRIP"} — ${fields.vehicleNo || ""} — ${fields.driver || ""}`);
  fd.set("formType", prefix === "pre" ? "Pre-Trip Inspection" : "Post-Trip Inspection");

  for (const [k, v] of Object.entries(fields)) {
    if (v) fd.set(k, v);
  }

  // Attach inspection items as a readable block, plus photo attachments.
  const lines: string[] = [];
  let photoIndex = 0;
  for (const [id, item] of Object.entries(itemsState)) {
    const photos = item.photos || [];
    if (!item.status && !item.note && photos.length === 0) continue;
    lines.push(`${id}: ${item.status || "—"}${item.note ? ` — ${item.note}` : ""}`);
    photos.forEach((dataUrl, pi) => {
      photoIndex++;
      fd.append(`${prefix}-photo-${photoIndex}`, dataUrlToFile(dataUrl, `${prefix}_${id}_${pi + 1}.jpg`));
    });
  }
  if (lines.length) fd.set(`${prefix}_items`, lines.join("\n"));

  // Attach overall image evidence (labelled), as a block + attachments.
  if (evidence.length) {
    fd.set(`${prefix}_evidence`, evidence.map((ev) => ev.caption).join("\n"));
    let evIndex = 0;
    for (const ev of evidence) {
      evIndex++;
      fd.append(`${prefix}-evidence-${evIndex}`, dataUrlToFile(ev.dataUrl, `${prefix}_evidence_${evIndex}.jpg`));
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
      const js = (await res.json().catch(() => null)) as {
        errors?: { message: string }[];
      } | null;
      const msg = js?.errors?.map((e) => e.message).join(", ");
      return { ok: false, message: msg || `Formspree returned ${res.status}` };
    }
    return { ok: true, message: "Inspection submitted. Check your email for the evidence." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Network error" };
  }
}

export function downloadBackup(payload: unknown, filename = "inspection.json"): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
