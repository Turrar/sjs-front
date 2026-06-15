"use client";

import type { EmployerReview } from "@/lib/types";
import { reviewerDisplayName } from "@/lib/review-display";
import { StarRating } from "@/components/ui/star-rating";
import { Card } from "@/components/ui/card";

type ReviewListCardProps = {
  review: EmployerReview;
  className?: string;
};

export function ReviewListCard({ review, className }: ReviewListCardProps) {
  const name = reviewerDisplayName(review);

  return (
    <Card className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <StarRating value={Math.round(review.rating)} readOnly size="sm" />
            <span className="text-sm font-medium text-foreground">
              {review.rating}/5
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{name}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(review.createdAt).toLocaleDateString("ru-RU", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
      {review.comment ? (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {review.comment}
        </p>
      ) : null}
    </Card>
  );
}
