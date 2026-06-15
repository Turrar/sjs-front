"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { fetchPublic } from "@/lib/session-api";
import type { EmployerReviewsResponse } from "@/lib/types";
import { EmployerReviewsSummary } from "@/components/reviews/employer-reviews-summary";
import { ReviewListCard } from "@/components/reviews/review-list-card";
import { DetailPageSkeleton } from "@/components/ui/skeleton";
import {
  EmptyState,
} from "@/components/layout/page";

export default function PublicEmployerReviewsPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [data, setData] = useState<EmployerReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchPublic<EmployerReviewsResponse>(
          routes.reviews.byEmployer(userId),
        );
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "Компания не найдена");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href={`/employers/${userId}`}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent"
      >
        <span aria-hidden>←</span> Профиль компании
      </Link>

      {loading ? (
        <DetailPageSkeleton />
      ) : error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 px-6 py-8 text-center">
          <p className="font-medium text-foreground">Компания не найдена</p>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      ) : data ? (
        <div className="space-y-6">
          <header className="border-b border-border/70 pb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Отзывы о {data.companyName ?? "компании"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Все оценки студентов
            </p>
          </header>

          <EmployerReviewsSummary
            avgRating={data.avgRating}
            reviewCount={data.reviewCount}
            companyName={data.companyName}
            reviews={data.reviews}
          />

          {data.reviews.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {data.reviews.map((review) => (
                <li key={review.id}>
                  <ReviewListCard review={review} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Пока нет отзывов"
              description="Станьте первым, кто оставит отзыв после стажировки или отклика."
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
