"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getStorage } from "./_lib/storage";
import { downloadTextFile } from "./_lib/download";
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
      .then((result) => {
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Budget, scenario bands, and budget-vs-actual tracking, per project.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
              e.target.value = "";
            }}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            Import snapshot
          </Button>
          <Button variant="outline" onClick={() => void handleExport()}>
            Export snapshot
          </Button>
          <Button render={<Link href="/setup" />} nativeButton={false}>
            New project
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {projects === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">No projects yet.</p>
          <Button render={<Link href="/setup" />} nativeButton={false} className="mt-4">
            Create your first project
          </Button>
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
            {projects.map((project) => (
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
