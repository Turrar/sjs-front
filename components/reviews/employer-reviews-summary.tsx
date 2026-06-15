"use client";

import type { EmployerReview } from "@/lib/types";
import { avgRatingLabel } from "@/lib/review-display";
import { StarRating } from "@/components/ui/star-rating";
import { Card } from "@/components/ui/card";

type EmployerReviewsSummaryProps = {
  avgRating: number | null;
  reviewCount: number;
  companyName?: string | null;
  reviews?: EmployerReview[];
  className?: string;
};

export function EmployerReviewsSummary({
  avgRating,
  reviewCount,
  companyName,
  reviews = [],
  className,
}: EmployerReviewsSummaryProps) {
  const displayAvg = avgRatingLabel(avgRating, reviewCount);
  const starValue =
    avgRating != null && reviewCount > 0 ? Math.round(avgRating) : 0;

  return (
    <Card className={className}>
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex flex-col items-center gap-1">
          <span className="text-5xl font-bold tabular-nums text-foreground">
            {displayAvg === "Пока нет отзывов" ? "—" : displayAvg}
          </span>
          {reviewCount > 0 ? (
            <StarRating value={starValue} readOnly size="sm" />
          ) : null}
          <span className="text-xs text-muted-foreground">средний рейтинг</span>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>
            Всего отзывов:{" "}
            <span className="font-semibold text-foreground">{reviewCount}</span>
          </p>
          {companyName ? (
            <p className="mt-1">
              Компания:{" "}
              <span className="font-semibold text-foreground">{companyName}</span>
            </p>
          ) : null}
        </div>
      </div>

      {reviews.length > 0 && reviewCount > 0 ? (
        <div className="mt-6 border-t border-border/70 pt-5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = reviews.filter((r) => Math.round(r.rating) === star).length;
            const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
            return (
              <div key={star} className="mb-1.5 flex items-center gap-3 text-sm">
                <span className="w-6 text-right text-muted-foreground">{star}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-right tabular-nums text-muted-foreground">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}
