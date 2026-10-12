"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/** True while the element's content is wider than its box, i.e. it scrolls horizontally. */
function useScrollsHorizontally(ref: React.RefObject<HTMLElement | null>) {
  const [scrolls, setScrolls] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setScrolls(el.scrollWidth > el.clientWidth + 1)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [ref])
  return scrolls
}

function Table({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<"table"> & { containerClassName?: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  // A table wider than its container gets a tab stop so keyboard users can scroll it with the
  // arrow keys even when it holds no focusable controls (e.g. Viewer role) — WCAG 2.1.1.
  const scrolls = useScrollsHorizontally(containerRef)
  return (
    <div
      ref={containerRef}
      data-slot="table-container"
      tabIndex={scrolls ? 0 : undefined}
      className={cn(
        "relative w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        containerClassName
      )}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
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
