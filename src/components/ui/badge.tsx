import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        // DESIGN.md Status Pill Tags — deterministic status communication only
        // (variance delta, run-rate alerts, confidence thresholds).
        "status-good":
          "border-[var(--viz-good-border)] bg-[var(--viz-good-bg)] text-[var(--viz-good)]",
        "status-warning":
          "border-[var(--viz-warning-border)] bg-[var(--viz-warning-bg)] text-[var(--viz-warning)]",
        "status-critical":
          "border-[var(--viz-critical-border)] bg-[var(--viz-critical-bg)] text-[var(--viz-critical)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const statusDotColor: Partial<Record<NonNullable<VariantProps<typeof badgeVariants>["variant"]>, string>> = {
  "status-good": "var(--viz-good)",
  "status-warning": "var(--viz-warning)",
  "status-critical": "var(--viz-critical)",
}

function Badge({
  className,
  variant = "default",
  dot,
  render,
  children,
  ...props
}: useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  const dotColor = variant ? statusDotColor[variant] : undefined
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
        children: (
          <>
            {dot && dotColor && (
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: dotColor }}
              />
            )}
            {children}
          </>
        ),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
