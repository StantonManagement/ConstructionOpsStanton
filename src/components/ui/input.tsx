import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full bg-transparent px-0 py-2 text-sm",
        "border-0 border-b border-[var(--input-border)]",
        "focus-visible:border-[var(--input-border-focus)] focus-visible:ring-0 focus-visible:outline-none",
        "placeholder:text-muted-foreground/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
