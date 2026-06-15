import { ApiError } from "@/lib/api-base";
import type { EmployerReview } from "@/lib/types";

export const COMMENT_MAX = 2000;

export function reviewerDisplayName(review: EmployerReview): string {
  if (review.reviewer) {
    const name = [review.reviewer.firstName, review.reviewer.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    return name || "Студент";
  }
  if (review.isAnonymous) return "Анонимно";
  return "Анонимно";
}

export function reviewErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    if (e.status === 403) {
      return "Оставлять отзывы могут только студенты.";
    }
    if (e.status === 404) {
      return "Работодатель не найден.";
    }
    if (e.status === 409) {
      return "Вы уже оставляли отзыв этому работодателю.";
    }
    if (e.status === 400) {
      return e.message || "Проверьте оценку и текст отзыва.";
    }
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return fallback;
}

export function avgRatingLabel(avgRating: number | null, reviewCount: number): string {
  if (reviewCount <= 0 || avgRating == null) return "Пока нет отзывов";
  return avgRating.toFixed(1);
}
