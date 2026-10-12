"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/** Which horizontal edges of a scroll container still hide content. */
function useHorizontalOverflow(ref: React.RefObject<HTMLElement | null>) {
  const [edges, setEdges] = React.useState({ scrolls: false, left: false, right: false })
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const scrolls = el.scrollWidth > el.clientWidth + 1
      const left = scrolls && el.scrollLeft > 1
      const right = scrolls && el.scrollLeft + el.clientWidth < el.scrollWidth - 1
      setEdges((prev) =>
        prev.scrolls === scrolls && prev.left === left && prev.right === right ? prev : { scrolls, left, right }
      )
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    el.addEventListener("scroll", update, { passive: true })
    return () => {
      observer.disconnect()
      el.removeEventListener("scroll", update)
    }
  }, [ref])
  return edges
}

const STICKY_FIRST_COLUMN =
  "[&_tr>*:first-child]:sticky [&_tr>*:first-child]:left-0 [&_tr>*:first-child]:z-10 [&_td:first-child]:bg-card [&_th:first-child]:bg-muted"

const STICKY_LAST_COLUMN =
  "[&_tr>*:last-child]:sticky [&_tr>*:last-child]:right-0 [&_tr>*:last-child]:z-10 [&_td:last-child]:bg-card [&_th:last-child]:bg-muted [&_tr>*:last-child]:shadow-[-6px_0_6px_-6px_rgb(0_0_0/0.15)]"

function Table({
  className,
  containerClassName,
  stickyFirstColumn = false,
  stickyLastColumn = false,
  ...props
}: React.ComponentProps<"table"> & {
  containerClassName?: string
  /** Keep the first column in view while the rest of the table scrolls sideways. */
  stickyFirstColumn?: boolean
  /** Keep the last column (e.g. a row action) in view at the right edge; its own edge shadow
   * replaces the right-hand scroll fade. */
  stickyLastColumn?: boolean
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const { scrolls, left, right } = useHorizontalOverflow(containerRef)
  return (
    <div className="relative min-w-0">
      {/* A table wider than its container gets a tab stop so keyboard users can scroll it with the
          arrow keys even when it holds no focusable controls (e.g. Viewer role) — WCAG 2.1.1 —
          plus an always-visible scrollbar and edge fades so touch users can see there is more. */}
      <div
        ref={containerRef}
        data-slot="table-container"
        tabIndex={scrolls ? 0 : undefined}
        className={cn(
          "relative w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          scrolls && "scrollbar-always-visible",
          containerClassName
        )}
      >
        <table
          data-slot="table"
          className={cn(
            "w-full caption-bottom text-sm",
            stickyFirstColumn && STICKY_FIRST_COLUMN,
            stickyLastColumn && STICKY_LAST_COLUMN,
            className
          )}
          {...props}
        />
      </div>
      {!stickyLastColumn && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent transition-opacity",
            right ? "opacity-100" : "opacity-0"
          )}
        />
      )}
      {!stickyFirstColumn && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-card to-transparent transition-opacity",
            left ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-muted [&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "h-9 border-b border-muted transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted [thead_&]:h-8 [thead_&]:border-border",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "px-2 text-left align-middle text-label-caps text-muted-foreground whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
