"use client";

import { useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type { EmployerReview, EmployerReviewsResponse } from "@/lib/types";
import { Card } from "@/components/ui/card";
import {
  EmptyState,
  LoadingHint,
  PageContainer,
  PageHeader,
} from "@/components/layout/page";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5 text-amber-400">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="text-base leading-none">
          {n <= Math.round(rating) ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

function ReviewCard({ review }: { review: EmployerReview }) {
  const name =
    review.isAnonymous || !review.reviewer
      ? "Анонимно"
      : [review.reviewer.firstName, review.reviewer.lastName].filter(Boolean).join(" ") ||
        "Студент";

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Stars rating={review.rating} />
            <span className="text-sm font-medium text-foreground">{review.rating}/5</span>
          </div>
          <p className="text-sm text-muted-foreground">{name}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(review.createdAt).toLocaleDateString("ru", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
      {review.comment && (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {review.comment}
        </p>
      )}
    </Card>
  );
}

export default function EmployerReviewsPage() {
  const { api, user } = useSession();
  const [data, setData] = useState<EmployerReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<EmployerReviewsResponse>(
          routes.reviews.byEmployer(user.id),
        );
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Ошибка загрузки");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, user?.id]);

  const avgRating = data?.avgRating ?? 0;

  return (
    <RoleGuard allow={["EMPLOYER"]}>
      <PageContainer>
        <PageHeader
          title="Отзывы о компании"
          description="Оценки и комментарии от студентов-стажёров."
        />

        {error && (
          <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        {loading ? (
          <LoadingHint />
        ) : data ? (
          <>
            {/* Summary header */}
            <Card className="mb-6 flex flex-wrap items-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <span className="text-5xl font-bold tabular-nums text-foreground">
                  {avgRating > 0 ? avgRating.toFixed(1) : "—"}
                </span>
                <Stars rating={avgRating} />
                <span className="text-xs text-muted-foreground">средний рейтинг</span>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>
                  Всего отзывов:{" "}
                  <span className="font-semibold text-foreground">{data.reviewCount}</span>
                </p>
                {data.companyName && (
                  <p className="mt-1">
                    Компания:{" "}
                    <span className="font-semibold text-foreground">{data.companyName}</span>
                  </p>
                )}
              </div>
            </Card>

            {/* Rating distribution */}
            {data.reviews.length > 0 && (
              <div className="mb-6">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = data.reviews.filter((r) => Math.round(r.rating) === star).length;
                  const pct = data.reviewCount > 0 ? (count / data.reviewCount) * 100 : 0;
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
            )}

            {/* Reviews list */}
            {data.reviews.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {data.reviews.map((review) => (
                  <li key={review.id}>
                    <ReviewCard review={review} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="Нет отзывов"
                description="Студенты пока не оставили отзывов о вашей компании."
              />
            )}
          </>
        ) : null}
      </PageContainer>
    </RoleGuard>
  );
}
