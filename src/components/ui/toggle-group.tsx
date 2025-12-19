import * as React from "react"
import { cn } from "@/lib/utils"

const ToggleGroupContext = React.createContext<{
  value: string | string[];
  onValueChange: (value: any) => void;
  type: "single" | "multiple";
}>({
  value: [],
  onValueChange: () => {},
  type: "multiple",
});

const ToggleGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string | string[];
    onValueChange: (value: any) => void;
    type?: "single" | "multiple";
  }
>(({ className, type = "single", value, onValueChange, children, ...props }, ref) => (
  <ToggleGroupContext.Provider value={{ value, onValueChange, type }}>
    <div
      ref={ref}
      className={cn("flex items-center justify-center gap-1", className)}
      {...props}
    >
      {children}
    </div>
  </ToggleGroupContext.Provider>
))
ToggleGroup.displayName = "ToggleGroup"

const ToggleGroupItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string;
  }
>(({ className, children, value, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext);
  
  const isSelected = Array.isArray(context.value) 
    ? context.value.includes(value)
    : context.value === value;

  const handleClick = () => {
    if (context.type === "single") {
      context.onValueChange(value);
    } else {
      const currentValues = Array.isArray(context.value) ? context.value : [];
      if (currentValues.includes(value)) {
        context.onValueChange(currentValues.filter((v) => v !== value));
      } else {
        context.onValueChange([...currentValues, value]);
      }
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      data-state={isSelected ? "on" : "off"}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        "bg-transparent border border-input px-3 py-1.5",
        "data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
})
ToggleGroupItem.displayName = "ToggleGroupItem"

export { ToggleGroup, ToggleGroupItem }
