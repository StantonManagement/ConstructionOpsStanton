import * as React from "react"
import { CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string
    onValueChange?: (value: string) => void
  }
>(({ className, value, onValueChange, children, ...props }, ref) => {
  return (
    <div className={cn("grid gap-2", className)} role="radiogroup" ref={ref} {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            // @ts-ignore
            checked: child.props.value === value,
            // @ts-ignore
            onCheckedChange: onValueChange,
          })
        }
        return child
      })}
    </div>
  )
})
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string
    checked?: boolean
    onCheckedChange?: (value: string) => void
  }
>(({ className, value, checked, onCheckedChange, ...props }, ref) => {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      value={value}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        "flex items-center justify-center",
        className
      )}
      onClick={() => onCheckedChange?.(value)}
      ref={ref}
      {...props}
    >
      {checked && (
        <div className="h-2.5 w-2.5 rounded-full bg-current fill-current" />
      )}
    </button>
  )
})
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
