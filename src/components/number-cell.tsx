"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

interface NumberCellProps {
  id: string;
  label: string;
  value: number;
  /** How far ArrowUp/ArrowDown move the value. */
  step: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
  /** Called on blur when the typed value can't be saved; the cell has already gone back to
   * `value`, the last good one. The message says what was wrong. */
  onReject?: (message: string) => void;
  className?: string;
}

const display = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** Reads what was typed: spaces and thousands commas ("60,000", "60 000") are allowed, since the
 * cell shows them when it isn't being edited. Empty counts as zero. */
function parse(raw: string): number {
  const compact = raw.replace(/[\s ]/g, "");
  if (compact === "") return 0;
  const unseparated = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(compact) ? compact.replace(/,/g, "") : compact;
  return Number(unseparated);
}

/** Hours and amounts are never negative (the engine rejects them, CLAUDE.md rule 4), so the cell
 * checks as you type rather than letting a bad value reach the model and blank the dashboard. */
function problemWith(raw: string): string | null {
  const value = parse(raw);
  if (!Number.isFinite(value)) return "Must be a number";
  if (value < 0) return "Can't be negative";
  return null;
}

/** A numeric cell that reads like the rest of the app: "60,000" at rest, the plain number while
 * editing. ArrowUp/ArrowDown step by `step` (the per-cell stepper buttons used to add two tab
 * stops to every cell). An invalid entry is marked in place and never passed on: on blur the cell
 * returns to its last good value and `onReject` says why. */
export function NumberCell({ id, label, value, step, onChange, onCommit, onReject, className }: NumberCellProps) {
  // What is in the box while it has focus; null at rest, when the formatted value shows.
  const [draft, setDraft] = useState<string | null>(null);
  const problem = draft === null ? null : problemWith(draft);
  const errorId = `${id}-error`;
  const safe = Number.isFinite(value) ? value : 0;

  function stepBy(delta: number) {
    const current = draft !== null && !problem ? parse(draft) : safe;
    const next = Math.max(0, Math.round((current + delta) * 100) / 100);
    setDraft(String(next));
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-1">
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={label}
        aria-invalid={problem ? true : undefined}
        aria-describedby={problem ? errorId : undefined}
        value={draft ?? display.format(safe)}
        onFocus={(e) => {
          setDraft(String(safe));
          // Select the plain number so typing replaces it, as a spreadsheet cell does.
          const input = e.currentTarget;
          requestAnimationFrame(() => input.select());
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          if (!problemWith(raw)) onChange(parse(raw));
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            stepBy(e.key === "ArrowUp" ? step : -step);
          } else if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        onBlur={() => {
          const typed = draft;
          setDraft(null);
          if (typed === null) return;
          if (problem) {
            onReject?.(`${label} ${problem.charAt(0).toLowerCase()}${problem.slice(1)}, so it stays at ${display.format(safe)}`);
            return;
          }
          onCommit(parse(typed));
        }}
        className={className ?? "h-7 w-24 text-right tabular-nums"}
      />
      {problem && (
        <p id={errorId} className="text-xs text-destructive">
          {problem}
        </p>
      )}
    </div>
  );
}
