"use client";

import { useSyncExternalStore } from "react";

// Local UI preference only — not project data, so it lives in localStorage rather than a
// snapshot (ticket 08). Same subscribe/dispatch pattern as RoleProvider.tsx: localStorage writes
// don't fire "storage" events in the tab that made them, so a custom event drives re-reads.
const STORAGE_KEY = "casedeck-hide-completed-projects";
const CHANGE_EVENT = "casedeck-hide-completed-projects-change";

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

function getSnapshot(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

function getServerSnapshot(): boolean {
  return false;
}

export function useHideCompletedProjects(): [boolean, (next: boolean) => void] {
  const hideCompleted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function setHideCompleted(next: boolean) {
    window.localStorage.setItem(STORAGE_KEY, String(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return [hideCompleted, setHideCompleted];
}
