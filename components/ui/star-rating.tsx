"use client";

import { cn } from "@/lib/cn";

type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
};

const sizeClass = {
  sm: "text-base",
  md: "text-2xl",
  lg: "text-3xl",
};

export function StarRating({
  value,
  onChange,
  max = 5,
  size = "md",
  readOnly = false,
}: StarRatingProps) {
  const stars = Array.from({ length: max }, (_, i) => i + 1);
  const cls = sizeClass[size];

  if (readOnly) {
    return (
      <span className={cn("flex gap-0.5 text-amber-400", cls)}>
        {stars.map((n) => (
          <span key={n}>{n <= value ? "★" : "☆"}</span>
        ))}
      </span>
    );
  }

  return (
    <div className="flex gap-1">
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={cn(
            "transition-colors",
            cls,
            n <= value ? "text-amber-400" : "text-muted",
          )}
        >
          {n <= value ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}
