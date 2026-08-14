"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getStorage } from "../_lib/storage";
import type { Project } from "@/engine/model";
import type { StoredActualEntry } from "@/storage/types";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputsEditor } from "./InputsEditor";
import { Dashboard } from "./Dashboard";
import { ActualsTab } from "./ActualsTab";

export default function ProjectPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <ProjectPageContent />
    </Suspense>
  );
}

function ProjectPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [actuals, setActuals] = useState<StoredActualEntry[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let ignore = false;
    void getStorage()
      .getProject(id)
      .then((p) => {
        if (!ignore) setProject(p ?? null);
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let ignore = false;
    void getStorage()
      .listActuals(id)
      .then((result) => {
        if (!ignore) setActuals(result);
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  async function reloadActuals(projectId: string) {
    setActuals(await getStorage().listActuals(projectId));
  }

  function updateLocal(next: Project) {
    setProject(next);
  }

  async function commit(next: Project) {
    setProject(next);
    try {
      await getStorage().saveProject(next);
      setSaveError(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes");
    }
  }

  if (!id) {
    return <p className="text-sm text-destructive">No project id given.</p>;
  }
  if (project === undefined) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (project === null) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-destructive">No project found with id &quot;{id}&quot;.</p>
        <Link href="/" className="text-sm underline">
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <Badge variant="outline">{project.type === "customer" ? "Customer" : "Internal"}</Badge>
            <Badge variant="secondary">{project.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {project.id} · {project.periodization} · {project.startPeriod}–{project.endPeriod} ·{" "}
            {project.currency}
          </p>
        </div>
        <Link href="/" className="text-sm underline">
          Back to projects
        </Link>
      </div>

      {saveError && (
        <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          Couldn&apos;t save your last change: {saveError}
        </p>
      )}

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="inputs">Inputs</TabsTrigger>
          <TabsTrigger value="actuals">Actuals</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard">
          {/* Same project + actuals state as the other tabs — one-way input -> engine -> views
              flow (PLAN.md §6.3), so a quick-adjust change or a committed import is reflected here
              immediately, no separate fetch or sync step. */}
          <Dashboard key={project.id} project={project} actuals={actuals} />
        </TabsContent>
        <TabsContent value="inputs">
          <InputsEditor key={project.id} project={project} onLocalChange={updateLocal} onCommit={commit} />
        </TabsContent>
        <TabsContent value="actuals">
          <ActualsTab
            key={project.id}
            project={project}
            actuals={actuals}
            onActualsChanged={() => void reloadActuals(project.id)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
