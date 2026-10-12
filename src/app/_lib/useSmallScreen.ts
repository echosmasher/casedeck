"use client";

import { useSyncExternalStore } from "react";

/** Tailwind's `sm` breakpoint: below it, layouts that need width (the Inputs grid) switch form. */
export const SMALL_SCREEN = "(max-width: 639.98px)";

function subscribe(callback: () => void) {
  const query = window.matchMedia(SMALL_SCREEN);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

/** True below `sm`. Renders one layout rather than hiding the other with CSS, so the inputs (and
 * their ids and labels) exist once. False on the server; the project page renders client-side. */
export function useSmallScreen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(SMALL_SCREEN).matches,
    () => false,
  );
}
