"use client";

import { useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type { EmployerReviewsResponse } from "@/lib/types";
import { reviewErrorMessage } from "@/lib/review-display";
import { EmployerReviewsSummary } from "@/components/reviews/employer-reviews-summary";
import { ReviewListCard } from "@/components/reviews/review-list-card";
import {
  EmptyState,
  PageContainer,
  PageHeader,
} from "@/components/layout/page";
import { SimpleListSkeleton } from "@/components/ui/skeleton";

export default function EmployerReviewsPage() {
  const { api, user } = useSession();
  const [data, setData] = useState<EmployerReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<EmployerReviewsResponse>(
          routes.reviews.byEmployer(user.id),
        );
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) {
          setError(reviewErrorMessage(e, "Ошибка загрузки"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, user?.id]);

  return (
    <RoleGuard allow={["EMPLOYER"]}>
      <PageContainer className="py-6 md:py-8">
        <PageHeader
          title="Отзывы о компании"
          description="Оценки и комментарии от студентов."
        />

        {error ? (
          <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {loading ? (
          <SimpleListSkeleton count={5} />
        ) : data ? (
          <>
            <EmployerReviewsSummary
              className="mb-6"
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
