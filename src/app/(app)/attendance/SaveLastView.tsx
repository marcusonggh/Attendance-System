"use client";

import { useEffect } from "react";
import { LAST_VIEW_COOKIE } from "./lastViewCookie";

// Records whichever view+date is currently on screen, so the next time
// the Attendance nav link is clicked (or the browser is reopened), it
// resumes here instead of resetting to this week.
export function SaveLastView({
  view,
  anchor,
}: {
  view: "day" | "week" | "month";
  anchor: string;
}) {
  useEffect(() => {
    document.cookie = `${LAST_VIEW_COOKIE}=${view}:${anchor}; path=/attendance; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }, [view, anchor]);

  return null;
}
