"use client";

import { ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";

interface NumberCellProps {
  id: string;
  label: string;
  value: number;
  step: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
}

/** A numeric input with real, keyboard-focusable nudge buttons (not decorative) — clicking or
 * pressing Enter/Space on a button adjusts the value by `step` and commits immediately. The
 * native number input itself already supports ArrowUp/ArrowDown and direct typing. */
export function NumberCell({ id, label, value, step, onChange, onCommit }: NumberCellProps) {
  function nudge(delta: number) {
    const next = Math.round((value + delta) * 100) / 100;
    onChange(next);
    onCommit(next);
  }

  return (
    <div className="flex items-center gap-0.5">
      <Input
        id={id}
        type="number"
        aria-label={label}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.valueAsNumber || 0)}
        onBlur={(e) => onCommit(e.target.valueAsNumber || 0)}
        className="h-7 w-24 text-right"
      />
      <div className="flex flex-col">
        <button
          type="button"
          aria-label={`Increase ${label} by ${step}`}
          className="flex h-3.5 w-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:outline-none"
          onClick={() => nudge(step)}
        >
          <ChevronUp className="size-3" />
        </button>
        <button
          type="button"
          aria-label={`Decrease ${label} by ${step}`}
          className="flex h-3.5 w-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:outline-none"
          onClick={() => nudge(-step)}
        >
          <ChevronDown className="size-3" />
        </button>
      </div>
    </div>
  );
}
