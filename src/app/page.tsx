"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getStorage } from "./_lib/storage";
import { downloadTextFile } from "./_lib/download";
import { demoSnapshot } from "./_lib/demoSnapshot";
import { isViewerVisible } from "./_lib/demoViewer";
import { useRole } from "./_lib/RoleProvider";
import { serializeSnapshot, parseSnapshot } from "@/storage/snapshot";
import type { ProjectSummary } from "@/storage/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_LABEL: Record<string, string> = {
  planning: "Planning",
  ready_for_approval: "Ready for Approval",
  approved: "Approved",
  in_progress: "In Progress",
  completed: "Completed",
  on_hold: "On Hold",
};

export default function ProjectListPage() {
  const { role } = useRole();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function reload() {
    const storage = getStorage();
    setProjects(await storage.listProjects());
  }

  useEffect(() => {
    let ignore = false;
    void getStorage()
      .listProjects()
      .then(async (result) => {
        // First boot: an empty database loads the Example Group demo automatically (PLAN.md §5).
        if (result.length === 0) {
          await getStorage().importSnapshot(demoSnapshot);
          result = await getStorage().listProjects();
        }
        if (!ignore) setProjects(result);
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function handleExport() {
    const storage = getStorage();
    const snapshot = await storage.exportSnapshot();
    downloadTextFile(
      `casedeck-snapshot-${new Date().toISOString().slice(0, 10)}.json`,
      serializeSnapshot(snapshot),
      "application/json",
    );
  }

  async function handleImportFile(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const snapshot = parseSnapshot(text);
      await getStorage().importSnapshot(snapshot);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    }
  }

  const visibleProjects =
    projects === null ? null : role === "viewer" ? projects.filter(isViewerVisible) : projects;
  const isPlanner = role === "planner";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Budget, scenario bands, and budget-vs-actual tracking, per project.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isPlanner && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportFile(file);
                  e.target.value = "";
                }}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                Import snapshot{" "}
                <span className="text-xs text-muted-foreground">(.json)</span>
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => void handleExport()}>
            Export snapshot <span className="text-xs text-muted-foreground">(.json)</span>
          </Button>
          {isPlanner && (
            <Button render={<Link href="/setup" />} nativeButton={false}>
              New project
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {visibleProjects === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : visibleProjects.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {isPlanner ? "No projects yet." : "No projects visible to the Viewer role."}
          </p>
          {isPlanner && (
            <Button render={<Link href="/setup" />} nativeButton={false} className="mt-4">
              Create your first project
            </Button>
          )}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleProjects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{project.id}</TableCell>
                <TableCell>
                  <Link href={`/project?id=${project.id}`} className="font-medium hover:underline">
                    {project.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{project.type === "customer" ? "Customer" : "Internal"}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{STATUS_LABEL[project.status] ?? project.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
