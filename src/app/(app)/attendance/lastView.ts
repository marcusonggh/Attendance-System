import { cookies } from "next/headers";
import { LAST_VIEW_COOKIE } from "./lastViewCookie";

export type LastView = { view: "day" | "week" | "month"; anchor: string };

// Stored as "view:anchor" (e.g. "day:2027-01-15") in a single cookie — simpler
// than two cookies, and the two always change together.
export async function getLastView(): Promise<LastView | null> {
  const store = await cookies();
  const raw = store.get(LAST_VIEW_COOKIE)?.value;
  if (!raw) return null;

  const [view, anchor] = raw.split(":");
  if (view !== "day" && view !== "week" && view !== "month") return null;
  if (!anchor) return null;

  return { view, anchor };
}
