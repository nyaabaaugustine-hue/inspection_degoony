import { NextRequest } from "next/server";
import { baserow } from "@/lib/baserow";

// POST /api/upload — multipart file → Baserow file storage. Returns the full
// upstream file object ({ name, url, ... }) so the client can attach it to a
// row's "photos" field.
export async function POST(req: NextRequest) {
  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return Response.json({ error: "Bad upload." }, { status: 400 });
  }
  const file = fd.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file." }, { status: 400 });
  }
  const out = new FormData();
  out.append("file", new Blob([await file.arrayBuffer()], { type: file.type }), file.name);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 20_000);
  let res: Response;
  try {
    res = await fetch(`${baserow.base}/api/user-files/upload-file/`, {
      method: "POST",
      headers: {
        // Baserow sits behind Cloudflare, which blocks non-browser user agents.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        Authorization: `Token ${baserow.token}`,
      },
      body: out,
      signal: ac.signal,
    });
  } catch {
    return Response.json({ error: "Upload timed out — check your connection." }, { status: 504 });
  } finally {
    clearTimeout(timer);
  }
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !data || (!data.name && !data.url)) {
    return Response.json({ error: "Upload failed." }, { status: 502 });
  }
  return Response.json(data);
}