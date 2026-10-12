"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";

interface NumberCellProps {
  id: string;
  label: string;
  value: number;
  step: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
  /** Called on blur when the typed value can't be saved; the cell has already gone back to
   * `value`, the last good one. The message says what was wrong. */
  onReject?: (message: string) => void;
}

/** Hours and amounts are never negative (the engine rejects them, CLAUDE.md rule 4), so the cell
 * checks as you type rather than letting a bad value reach the model and blank the dashboard. */
function problemWith(raw: string): string | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return "Must be a number";
  if (value < 0) return "Can't be negative";
  return null;
}

/** A numeric input with real, keyboard-focusable nudge buttons (not decorative) — clicking or
 * pressing Enter/Space on a button adjusts the value by `step` and commits immediately. The
 * native number input itself already supports ArrowUp/ArrowDown and direct typing. An invalid
 * entry is marked in place and never passed on: on blur the cell returns to its last good value. */
export function NumberCell({ id, label, value, step, onChange, onCommit, onReject }: NumberCellProps) {
  // What the user typed, while it differs from a value the model can hold.
  const [draft, setDraft] = useState<string | null>(null);
  const problem = draft === null ? null : problemWith(draft);
  const errorId = `${id}-error`;

  function nudge(delta: number) {
    const next = Math.max(0, Math.round((value + delta) * 100) / 100);
    setDraft(null);
    onChange(next);
    onCommit(next);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-0.5">
        <Input
          id={id}
          type="number"
          min={0}
          aria-label={label}
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? errorId : undefined}
          value={draft ?? (Number.isFinite(value) ? value : 0)}
          onChange={(e) => {
            const raw = e.target.value;
            if (problemWith(raw)) {
              setDraft(raw);
              return;
            }
            setDraft(null);
            onChange(e.target.valueAsNumber || 0);
          }}
          onBlur={(e) => {
            if (problem) {
              setDraft(null);
              onReject?.(`${label} ${problem.charAt(0).toLowerCase()}${problem.slice(1)}, so it stays at ${value}`);
              return;
            }
            onCommit(e.target.valueAsNumber || 0);
          }}
          className="h-7 w-24 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {/* Side by side at 24×24 each (WCAG 2.2 target size, 2.5.8): stacked, they were 16×14. The
            browser's own spinner is hidden — these buttons replace it, and it ate into the digits. */}
        <div className="flex">
          <button
            type="button"
            aria-label={`Decrease ${label} by ${step}`}
            disabled={value <= 0}
            className="flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
            onClick={() => nudge(-step)}
          >
            <ChevronDown className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Increase ${label} by ${step}`}
            className="flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:outline-none"
            onClick={() => nudge(step)}
          >
            <ChevronUp className="size-3.5" />
          </button>
        </div>
      </div>
      {problem && (
        <p id={errorId} className="text-xs text-destructive">
          {problem}
        </p>
      )}
    </div>
  );
}
