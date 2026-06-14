export function reviewsCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} отзывов`;
  if (mod10 === 1) return `${count} отзыв`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} отзыва`;
  return `${count} отзывов`;
}

export function employerRatingLine(
  avgRating: number | null,
  reviewCount: number,
): string {
  if (reviewCount <= 0 || avgRating == null) return "Пока нет отзывов";
  return `★ ${avgRating.toFixed(1)} · ${reviewsCountLabel(reviewCount)}`;
}

export function publishedJobsLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} вакансий`;
  if (mod10 === 1) return `${count} вакансия`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} вакансии`;
  return `${count} вакансий`;
}
