import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({
  className = "",
  variant = "primary",
  ...props
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-[transform,opacity,box-shadow] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";
  const variants: Record<NonNullable<Props["variant"]>, string> = {
    primary:
      "bg-accent text-accent-foreground shadow-sm shadow-accent/20 hover:brightness-105",
    secondary:
      "border border-border bg-card text-foreground shadow-sm hover:bg-muted/80",
    ghost: "bg-transparent text-foreground hover:bg-muted/80",
    danger: "bg-danger text-white shadow-sm hover:brightness-105",
  };
  return (
    <button
      type="button"
      className={cn(base, variants[variant], className)}
      {...props}
    />
  );
}
