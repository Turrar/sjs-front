import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { selectClass } from "@/lib/select-class";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  wrapperClassName?: string;
};

export function Select({
  label,
  className,
  wrapperClassName,
  id,
  children,
  ...props
}: SelectProps) {
  const selectId = id ?? (label ? label.replace(/\s+/g, "-").toLowerCase() : undefined);

  return (
    <div className={cn("flex flex-col gap-2", wrapperClassName)}>
      {label ? (
        <label htmlFor={selectId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      ) : null}
      <select
        id={selectId}
        className={cn(selectClass, className)}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
