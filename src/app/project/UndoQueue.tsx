"use client";

// Undoable deletes, shared by recorded actuals and cost lines (DASHBOARD-CRITIQUE-PLAN.md Phase 1b,
// QA-ROUND-3-PLAN.md Phase 3). A delete is saved immediately but stays restorable for
// UNDO_WINDOW_MS (paused while the pointer or focus is on it). Focus never falls to <body>: after a
// delete it moves to that item's Undo, and after an Undo to the "Restored …" message.
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** How long a deleted item stays restorable. Paused while the pointer or focus is on it. */
export const UNDO_WINDOW_MS = 8000;

interface Options<T> {
  /** Specific enough to tell two items apart in a screen-reader label or a message. */
  describe: (item: T) => string;
  /** What the change does beyond the list, e.g. that a closed period moves the headline. */
  consequence?: (item: T) => string | null;
  /** Writes the item back through storage; throw to report a failure. */
  restore: (item: T) => Promise<void>;
}

export function useUndoQueue<T extends { id: string }>({ describe, consequence, restore }: Options<T>) {
  const [deleted, setDeleted] = useState<T[]>([]);
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const undoButtons = useRef(new Map<string, HTMLButtonElement>());
  const statusRef = useRef<HTMLParagraphElement>(null);
  const focusTarget = useRef<{ undoFor: string } | "status" | null>(null);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => clearTimeout(t));
  }, []);

  // The control that was clicked is gone after either action, so hand focus on deliberately.
  useEffect(() => {
    const target = focusTarget.current;
    if (!target) return;
    focusTarget.current = null;
    if (target === "status") statusRef.current?.focus();
    else undoButtons.current.get(target.undoFor)?.focus();
  }, [deleted, statusMessage]);

  function setBusy(id: string, busy: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function dismiss(id: string) {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setDeleted((prev) => prev.filter((e) => e.id !== id));
  }

  function startTimer(id: string) {
    clearTimeout(timers.current.get(id));
    timers.current.set(id, setTimeout(() => dismiss(id), UNDO_WINDOW_MS));
  }

  function pauseTimer(id: string) {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }

  /** Runs `doDelete` and, if it succeeds, offers Undo. `doDelete` throws (or resolves `false`)
   * on failure; a thrown message is shown here, a `false` means the caller already reported it. */
  async function remove(item: T, doDelete: () => Promise<boolean | void>) {
    setBusy(item.id, true);
    setError(null);
    setStatusMessage(null);
    try {
      if ((await doDelete()) === false) return;
      focusTarget.current = { undoFor: item.id };
      setDeleted((prev) => [...prev.filter((e) => e.id !== item.id), item]);
      startTimer(item.id);
    } catch (err) {
      setError(`Couldn't delete ${describe(item)}: ${err instanceof Error ? err.message : "storage error"}`);
    } finally {
      setBusy(item.id, false);
    }
  }

  async function undo(item: T) {
    pauseTimer(item.id);
    setBusy(item.id, true);
    setError(null);
    try {
      await restore(item);
      dismiss(item.id);
      focusTarget.current = "status";
      setStatusMessage(joinSentences(`Restored ${describe(item)}.`, consequence?.(item)));
    } catch (err) {
      startTimer(item.id);
      setError(`Couldn't restore ${describe(item)}: ${err instanceof Error ? err.message : "storage error"}`);
    } finally {
      setBusy(item.id, false);
    }
  }

  /** Lets the caller report its own outcome (e.g. "Added …") in the same status line. */
  function announce(message: string) {
    setError(null);
    setStatusMessage(message);
  }

  const panel = (
    <>
      <ul aria-live="polite" className="flex flex-col gap-2 empty:hidden">
        {deleted.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md border bg-muted px-3 py-2 text-sm"
            onMouseEnter={() => pauseTimer(item.id)}
            onMouseLeave={() => startTimer(item.id)}
            onFocus={() => pauseTimer(item.id)}
            onBlur={() => startTimer(item.id)}
          >
            <span className="min-w-0">
              <span className="font-medium">Deleted</span>{" "}
              <span className="tabular-nums">{describe(item)}</span>
              {consequence?.(item) && <span className="text-muted-foreground"> {consequence(item)}</span>}
            </span>
            <Button
              ref={(el) => {
                if (el) undoButtons.current.set(item.id, el);
                else undoButtons.current.delete(item.id);
              }}
              type="button"
              variant="outline"
              size="sm"
              disabled={busyIds.has(item.id)}
              aria-label={`Undo delete of ${describe(item)}`}
              onClick={() => void undo(item)}
            >
              Undo
            </Button>
          </li>
        ))}
      </ul>
      <p
        ref={statusRef}
        role="status"
        tabIndex={-1}
        className="rounded-sm text-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 empty:hidden"
      >
        {statusMessage}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  );

  return { panel, remove, announce, isBusy: (id: string) => busyIds.has(id) };
}

export function joinSentences(first: string, second: string | null | undefined) {
  return second ? `${first} ${second}` : first;
}
