"use client";

import Link from "next/link";
import type { EmployerReview, PublicEmployerJob, PublicEmployerProfile } from "@/lib/types";
import { verificationStatusBadge } from "@/lib/employer-display";
import {
  employerRatingLine,
  publishedJobsLabel,
} from "@/lib/employer-profile-display";
import { reviewerDisplayName } from "@/lib/review-display";
import { jobLocationLine, salaryLine } from "@/lib/job-display";
import { PremiumBadge } from "@/components/ui/premium-badge";
import { StarRating } from "@/components/ui/star-rating";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

function ReviewPreview({ review }: { review: EmployerReview }) {
  const name = reviewerDisplayName(review);

  return (
    <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StarRating value={Math.round(review.rating)} readOnly size="sm" />
          <span className="text-xs text-muted-foreground">{name}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(review.createdAt).toLocaleDateString("ru-RU")}
        </span>
      </div>
      {review.comment ? (
        <p className="mt-2 text-sm leading-relaxed text-foreground">{review.comment}</p>
      ) : null}
    </div>
  );
}

function JobPreviewRow({
  job,
  jobsHrefPrefix,
}: {
  job: PublicEmployerJob;
  jobsHrefPrefix: string;
}) {
  const location = jobLocationLine({ city: job.city, location: null });
  const salary = salaryLine(job);

  return (
    <Link
      href={`${jobsHrefPrefix}/${job.id}`}
      className="flex flex-col gap-1 rounded-xl border border-border/70 bg-card px-4 py-3 transition-colors hover:border-accent/30 hover:bg-muted/30"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">{job.title}</span>
        {job.isPremium ? <PremiumBadge /> : null}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {location ? <span>{location}</span> : null}
        {salary ? <span>{salary}</span> : null}
      </div>
    </Link>
  );
}

type EmployerPublicViewProps = {
  profile: PublicEmployerProfile;
  /** Префикс ссылок на вакансии, например `/jobs` или `/dashboard/jobs` */
  jobsHrefPrefix?: string;
  /** Только шапка и описание — без списков отзывов и вакансий */
  headerOnly?: boolean;
  /** Компактный блок для карточки на странице вакансии */
  compact?: boolean;
  /** Ссылка на полную страницу компании */
  companyPageHref?: string;
  /** Базовый путь страницы компании для ссылки «Все отзывы» */
  employerPageHref?: string;
};

export function EmployerPublicView({
  profile,
  jobsHrefPrefix = "/jobs",
  headerOnly = false,
  compact = false,
  companyPageHref,
  employerPageHref,
}: EmployerPublicViewProps) {
  const badge = verificationStatusBadge(profile.verificationStatus);
  const reviews = profile.recentReviews ?? [];
  const jobs = profile.publishedJobs ?? [];
  const jobsCount = profile.publishedJobsCount ?? jobs.length;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        {profile.logoUrl ? (
          <img
            src={profile.logoUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl border border-border object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
            —
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{profile.companyName}</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {employerRatingLine(profile.avgRating, profile.reviewCount)}
            {jobsCount > 0 ? ` · ${publishedJobsLabel(jobsCount)}` : ""}
          </p>
          {profile.website ? (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent hover:underline"
            >
              Сайт компании
            </a>
          ) : null}
          {companyPageHref && compact ? (
            <Link href={companyPageHref} className="inline-block text-sm font-medium text-accent hover:underline">
              Профиль компании →
            </Link>
          ) : null}
        </div>
      </div>

      {profile.description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{profile.description}</p>
      ) : compact ? null : (
        <p className="text-sm italic text-muted-foreground">Описание пока не заполнено</p>
      )}

      {!headerOnly && !compact && reviews.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Последние отзывы</h3>
            {profile.reviewCount > 0 ? (
              <Link
                href={`${employerPageHref ?? `/employers/${profile.userId}`}/reviews`}
                className="text-sm font-medium text-accent hover:underline"
              >
                Все отзывы ({profile.reviewCount})
              </Link>
            ) : null}
          </div>
          <div className="space-y-2">
            {reviews.map((review) => (
              <ReviewPreview key={review.id} review={review} />
            ))}
          </div>
        </div>
      ) : null}

      {!headerOnly && !compact && jobs.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Вакансии
            {jobsCount > jobs.length ? ` · показано ${jobs.length} из ${jobsCount}` : ""}
          </h3>
          <div className="space-y-2">
            {jobs.map((job) => (
              <JobPreviewRow key={job.id} job={job} jobsHrefPrefix={jobsHrefPrefix} />
            ))}
          </div>
        </div>
      ) : null}

      {!headerOnly && !compact && reviews.length === 0 && jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Пока нет опубликованных вакансий и отзывов.
        </p>
      ) : null}
    </div>
  );
}

export function EmployerPublicPageSections({
  profile,
  jobsHrefPrefix = "/jobs",
}: {
  profile: PublicEmployerProfile;
  jobsHrefPrefix?: string;
}) {
  const employerBase = `/employers/${profile.userId}`;

  return (
    <div className="space-y-6">
      <Card>
        <EmployerPublicView profile={profile} jobsHrefPrefix={jobsHrefPrefix} headerOnly />
      </Card>

      {profile.reviewCount > 0 || profile.recentReviews.length > 0 ? (
        <Card>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Отзывы</CardTitle>
              <CardDescription>
                Последние отзывы студентов о компании.
              </CardDescription>
            </div>
            {profile.reviewCount > 0 ? (
              <Link
                href={`${employerBase}/reviews`}
                className="text-sm font-medium text-accent hover:underline"
              >
                Все отзывы ({profile.reviewCount})
              </Link>
            ) : null}
          </div>
          {profile.recentReviews.length > 0 ? (
            <div className="space-y-3">
              {profile.recentReviews.map((review) => (
                <ReviewPreview key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Пока нет отзывов.</p>
          )}
        </Card>
      ) : null}

      {profile.publishedJobs.length > 0 ? (
        <Card>
          <CardTitle>Вакансии компании</CardTitle>
          <CardDescription className="mb-4">
            {publishedJobsLabel(profile.publishedJobsCount)}
            {profile.publishedJobsCount > profile.publishedJobs.length
              ? ` · на странице ${profile.publishedJobs.length}`
              : ""}
          </CardDescription>
          <div className="space-y-2">
            {profile.publishedJobs.map((job) => (
              <JobPreviewRow
                key={job.id}
                job={job}
                jobsHrefPrefix={jobsHrefPrefix}
              />
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
