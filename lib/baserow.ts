// Server-only Baserow connector. Never import from client components — the
// API token must not reach the browser bundle. Access via /api routes only.
export const baserow = {
  base: (
    process.env.BASEROW_BASE_URL ||
    process.env.NEXT_PUBLIC_BASEROW_BASE_URL ||
    "https://api.baserow.io"
  ).replace(/\/+$/, "").trim(),
  token: (process.env.BASEROW_API_TOKEN || "").trim(),
};