"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

export type Role = "planner" | "viewer";

const STORAGE_KEY = "casedeck-role";
// localStorage.setItem doesn't fire a "storage" event in the tab that made the change (only in
// other tabs) — this custom event is how setRole tells useSyncExternalStore's subscribers to
// re-read.
const ROLE_CHANGE_EVENT = "casedeck-role-change";

function subscribe(callback: () => void) {
  window.addEventListener(ROLE_CHANGE_EVENT, callback);
  return () => window.removeEventListener(ROLE_CHANGE_EVENT, callback);
}

function getSnapshot(): Role {
  return window.localStorage.getItem(STORAGE_KEY) === "viewer" ? "viewer" : "planner";
}

// Server-rendered HTML always assumes Planner — localStorage isn't available during SSR/static
// prerender. useSyncExternalStore uses this for both the server render and the client's initial
// hydration pass (matching it exactly, per React's own design for this), then switches to the
// real getSnapshot() value right after — no hydration mismatch, and no setState-in-effect either.
function getServerSnapshot(): Role {
  return "planner";
}

const RoleContext = createContext<{ role: Role; setRole: (role: Role) => void }>({
  role: "planner",
  setRole: () => {},
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const role = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function setRole(next: Role) {
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(ROLE_CHANGE_EVENT));
  }

  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}
