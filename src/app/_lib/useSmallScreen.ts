"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Tailwind's `sm` breakpoint: below it, layouts that need width (the Inputs grid) switch form. */
export const SMALL_SCREEN = "(max-width: 639.98px)";

/** Tailwind's `md` breakpoint: below it, wide tables (variance, recorded actuals) stack. Also
 * catches a laptop at 200% zoom. */
export const MEDIUM_SCREEN = "(max-width: 767.98px)";

/** True while `query` matches. Renders one layout rather than hiding the other with CSS, so the
 * inputs (and their ids and labels) exist once. False on the server; the project page renders
 * client-side. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", callback);
      return () => list.removeEventListener("change", callback);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** True below `sm`. */
export function useSmallScreen(): boolean {
  return useMediaQuery(SMALL_SCREEN);
}
