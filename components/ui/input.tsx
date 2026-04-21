import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

const inputClass =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-card-foreground shadow-sm outline-none transition-[box-shadow,border-color] placeholder:text-muted-foreground/80 focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-ring/25";

export function Input({ label, error, className = "", id, ...props }: Props) {
  const inputId =
    id ?? (label ? label.replace(/\s+/g, "-").toLowerCase() : undefined);
  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-foreground"
        >
          {label}
        </label>
      ) : null}
      <input id={inputId} className={cn(inputClass, className)} {...props} />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
