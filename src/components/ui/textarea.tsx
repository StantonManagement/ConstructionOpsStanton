import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[60px] w-full bg-transparent px-0 py-2 text-sm resize-none",
        "border-0 border-b border-[var(--input-border)]",
        "focus-visible:border-[var(--input-border-focus)] focus-visible:ring-0 focus-visible:outline-none",
        "placeholder:text-muted-foreground/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }





