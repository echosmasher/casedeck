"use client";

import { useState } from "react";
import { useRole } from "@/app/_lib/RoleProvider";
import { getStorage } from "@/app/_lib/storage";
import { demoSnapshot } from "@/app/_lib/demoSnapshot";
import { Button } from "@/components/ui/button";

export function DemoHeader() {
  const { role, setRole } = useRole();
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    if (
      !window.confirm(
        "Reset demo data? This replaces everything in this browser with the original Example Group demo — any edits you've made will be lost.",
      )
    ) {
      return;
    }
    setResetting(true);
    await getStorage().importSnapshot(demoSnapshot);
    // Full reload (not client navigation) so every mounted component's IndexedDB-derived state
    // starts clean, not just the current page's — reset can be triggered from any page (e.g. a
    // project detail view for a project that reset may remove), so a soft re-fetch of local state
    // isn't enough here the way it is for the project-list page's own snapshot import.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-lg border p-0.5 text-sm" role="group" aria-label="Demo role">
        <button
          type="button"
          className={`rounded-md px-2.5 py-1 transition-colors ${role === "planner" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          aria-pressed={role === "planner"}
          onClick={() => setRole("planner")}
        >
          Planner
        </button>
        <button
          type="button"
          className={`rounded-md px-2.5 py-1 transition-colors ${role === "viewer" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          aria-pressed={role === "viewer"}
          onClick={() => setRole("viewer")}
        >
          Viewer
        </button>
      </div>
      <Button type="button" variant="outline" size="sm" disabled={resetting} onClick={() => void handleReset()}>
        {resetting ? "Resetting…" : "Demo data — reset"}
      </Button>
    </div>
  );
}
