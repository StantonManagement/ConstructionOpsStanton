import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        // Priority variants using CSS variables
        emergency:
          "border-transparent bg-[var(--status-critical-bg)] text-[var(--status-critical-text)] dark:bg-[var(--status-critical-bg)] dark:text-[var(--status-critical-text)]",
        high:
          "border-transparent bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] dark:bg-[var(--status-warning-bg)] dark:text-[var(--status-warning-text)]",
        normal:
          "border-transparent bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] dark:bg-[var(--status-neutral-bg)] dark:text-[var(--status-neutral-text)]",
        low:
          "border-transparent bg-[var(--priority-low-bg)] text-[var(--priority-low-text)] dark:bg-[var(--priority-low-bg)] dark:text-[var(--priority-low-text)]",
        // Status variants using CSS variables
        new:
          "border-transparent bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] dark:bg-[var(--status-warning-bg)] dark:text-[var(--status-warning-text)]",
        "in-progress":
          "border-transparent bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary",
        completed:
          "border-transparent bg-[var(--status-success-bg)] text-[var(--status-success-text)] dark:bg-[var(--status-success-bg)] dark:text-[var(--status-success-text)]",
        waiting:
          "border-transparent bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] dark:bg-[var(--status-warning-bg)] dark:text-[var(--status-warning-text)]",
        // Construction-specific status variants using CSS variables
        "sms-sent":
          "border-transparent bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] dark:bg-[var(--status-warning-bg)] dark:text-[var(--status-warning-text)]",
        "review-queue":
          "border-transparent bg-[var(--status-critical-bg)] text-[var(--status-critical-text)] dark:bg-[var(--status-critical-bg)] dark:text-[var(--status-critical-text)]",
        "ready-checks":
          "border-transparent bg-[var(--status-success-bg)] text-[var(--status-success-text)] dark:bg-[var(--status-success-bg)] dark:text-[var(--status-success-text)]",
        "paid":
          "border-transparent bg-[var(--status-success-bg)] text-[var(--status-success-text)] dark:bg-[var(--status-success-bg)] dark:text-[var(--status-success-text)]",
        "pending":
          "border-transparent bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] dark:bg-[var(--status-warning-bg)] dark:text-[var(--status-warning-text)]",
        "rejected":
          "border-transparent bg-[var(--status-critical-bg)] text-[var(--status-critical-text)] dark:bg-[var(--status-critical-bg)] dark:text-[var(--status-critical-text)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
