// Shared by both the client-side writer (SaveLastView) and the server-side
// reader (lastView.ts) — kept free of server-only imports so the client
// component doesn't accidentally pull in "next/headers".
export const LAST_VIEW_COOKIE = "attendance_last";
