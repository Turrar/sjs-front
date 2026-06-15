"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type { ReviewsMeResponse, StudentReview } from "@/lib/types";
import { reviewErrorMessage } from "@/lib/review-display";
import { StarRating } from "@/components/ui/star-rating";
import { Card } from "@/components/ui/card";
import {
  EmptyState,
  PageContainer,
  PageHeader,
} from "@/components/layout/page";
import { SimpleListSkeleton } from "@/components/ui/skeleton";

function MyReviewCard({ review }: { review: StudentReview }) {
  const companyLabel = review.companyName?.trim() || "Компания";

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {review.companyName ? (
              <Link
                href={`/employers/${review.employerUserId}`}
                className="font-semibold text-foreground hover:text-accent hover:underline"
              >
                {companyLabel}
              </Link>
            ) : (
              <p className="font-semibold text-foreground">{companyLabel}</p>
            )}
            {review.isAnonymous ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                Анонимно
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <StarRating value={Math.round(review.rating)} readOnly size="sm" />
            <span className="text-sm text-muted-foreground">{review.rating}/5</span>
          </div>
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

export default function MyReviewsPage() {
  const { api } = useSession();
  const [reviews, setReviews] = useState<StudentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ReviewsMeResponse>(routes.reviews.me);
      setReviews(res.reviews ?? []);
    } catch (e) {
      setError(reviewErrorMessage(e, "Ошибка загрузки"));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <RoleGuard allow={["STUDENT"]}>
      <PageContainer className="py-6 md:py-8">
        <PageHeader
          title="Мои отзывы"
          description="Оценки работодателей, которые вы оставили."
        />

        {error ? (
          <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {loading ? (
          <SimpleListSkeleton count={4} />
        ) : reviews.length === 0 && !error ? (
          <EmptyState
            title="Вы ещё не оставляли отзывов"
            description="Отзыв можно отправить со страницы отклика или стажировки."
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {reviews.map((review) => (
              <li key={review.id}>
                <MyReviewCard review={review} />
              </li>
            ))}
          </ul>
        )}
      </PageContainer>
    </RoleGuard>
  );
}
