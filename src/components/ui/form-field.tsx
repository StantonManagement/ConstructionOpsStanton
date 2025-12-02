import * as React from "react"
import { Label } from "./label"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  label: string;
  required?: boolean;
  helper?: string;
  suffix?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ 
  label, 
  required, 
  helper, 
  suffix, 
  error,
  children, 
  className 
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>
        {label}
        {required && <span className="text-muted-foreground/50 ml-1">*</span>}
      </Label>
      <div className="flex items-center gap-2">
        {children}
        {suffix && <span className="text-xs text-muted-foreground whitespace-nowrap">{suffix}</span>}
      </div>
      {helper && !error && <p className="text-xs text-muted-foreground/70">{helper}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}


