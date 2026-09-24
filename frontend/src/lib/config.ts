export const APP_NAME = "LungVision AI";

// Browser-side API base. Relative by default so every request goes to whatever
// origin the app is being served from (localhost, a LAN IP, or an HTTPS tunnel).
// Next.js rewrites /pneumonia/backend/* through to Apache — see next.config.mjs.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "/pneumonia/backend/api";

// Server-side API base. Server components and the NextAuth authorize() callback
// run in Node, where a relative URL cannot be fetched, so they need an absolute
// one that reaches Apache directly.
export const SERVER_API_BASE_URL =
  process.env.INTERNAL_API_BASE_URL ?? "http://127.0.0.1/pneumonia/backend/api";

// Origin that serves uploaded images (backend root, i.e. API base without the /api suffix).
export const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

// Build a URL for a stored image path like "uploads/xrays/scan_x.jpg".
export function imageUrl(path?: string | null): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${BACKEND_ORIGIN}/${path.replace(/^\/+/, "")}`;
}
