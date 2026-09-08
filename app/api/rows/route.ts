import { NextRequest } from "next/server";
import { baserow } from "@/lib/baserow";

// Baserow sits behind Cloudflare, which blocks non-browser user agents (1010/502).
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Authorization: `Token ${baserow.token}`,
};

function okResponse(body: Record<string, unknown>) {
  return Response.json(body);
}

// GET /api/rows?table=<id>  →  { results: [...] } (Baserow row list)
export async function GET(req: NextRequest) {
  const table = req.nextUrl.searchParams.get("table") || "";
  if (!/^\d+$/.test(table)) {
    return okResponse({ results: [], error: "Invalid table." });
  }
  try {
    const res = await fetch(
      `${baserow.base}/api/database/rows/table/${table}/?user_field_names=true&include=photos&size=100`,
      { headers: HEADERS },
    );
    if (!res.ok) return okResponse({ results: [], error: `Baserow ${res.status}` });
    return okResponse(await res.json());
  } catch {
    return okResponse({ results: [], error: "Could not reach Baserow." });
  }
}

// PATCH /api/rows  body { tableId, rowId, row }  →  edit an existing row
export async function PATCH(req: NextRequest) {
  let body: { tableId?: unknown; rowId?: unknown; row?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return okResponse({ ok: false, message: "Bad request body." });
  }
  const { tableId, rowId, row } = body;
  if (
    !Number.isInteger(tableId) ||
    !Number.isInteger(rowId) ||
    !row ||
    typeof row !== "object"
  ) {
    return okResponse({ ok: false, message: "Bad request body." });
  }
  try {
    const res = await fetch(
      `${baserow.base}/api/database/rows/table/${tableId}/${rowId}/?user_field_names=true`,
      {
        method: "PATCH",
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify(row),
      },
    );
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      const msg =
        (data && ((data.error as string) || (data.detail as string))) ||
        `Baserow ${res.status}`;
      return okResponse({ ok: false, message: msg });
    }
    return okResponse({
      ok: true,
      message: "Record updated.",
      id: data && typeof data.id === "number" ? data.id : null,
    });
  } catch {
    return okResponse({ ok: false, message: "Network error reaching Baserow." });
  }
}

// POST /api/rows  body { tableId, row }  →  { ok, message, id? }
export async function POST(req: NextRequest) {
  let body: { tableId?: unknown; row?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return okResponse({ ok: false, message: "Bad request body." });
  }
  const tableId = body.tableId;
  const row = body.row;
  if (!Number.isInteger(tableId) || !row || typeof row !== "object") {
    return okResponse({ ok: false, message: "Bad request body." });
  }
  try {
    const res = await fetch(
      `${baserow.base}/api/database/rows/table/${tableId}/?user_field_names=true`,
      {
        method: "POST",
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify(row),
      },
    );
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      const msg =
        (data && ((data.error as string) || (data.detail as string))) ||
        `Baserow ${res.status}`;
      return okResponse({ ok: false, message: msg });
    }
    return okResponse({
      ok: true,
      message: "Saved to DEGOONY database.",
      id: data && typeof data.id === "number" ? data.id : null,
    });
  } catch {
    return okResponse({ ok: false, message: "Network error reaching Baserow." });
  }
}