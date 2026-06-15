"use client";

import { useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import type { CreateReviewResponse, ReviewRating } from "@/lib/types";
import { COMMENT_MAX, reviewErrorMessage } from "@/lib/review-display";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/ui/star-rating";
import { cn } from "@/lib/cn";

type EmployerReviewModalProps = {
  open: boolean;
  onClose: () => void;
  employerUserId: string;
  companyName?: string | null;
  onSuccess: () => void;
};

export function EmployerReviewModal({
  open,
  onClose,
  employerUserId,
  companyName,
  onSuccess,
}: EmployerReviewModalProps) {
  const { api } = useSession();
  const { success: toastSuccess, toast: notifyToast } = useToast();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setRating(0);
    setComment("");
    setIsAnonymous(true);
    setError(null);
  }

  function handleClose() {
    if (saving) return;
    resetForm();
    onClose();
  }

  async function submit() {
    if (rating < 1) {
      setError("Укажите оценку от 1 до 5");
      return;
    }
    const trimmed = comment.trim();
    if (trimmed.length > COMMENT_MAX) {
      setError(`Комментарий не длиннее ${COMMENT_MAX} символов.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.post<CreateReviewResponse>(routes.reviews.create, {
        employerUserId,
        rating: rating as ReviewRating,
        comment: trimmed || undefined,
        isAnonymous,
      });
      toastSuccess("Отзыв отправлен");
      resetForm();
      onSuccess();
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        notifyToast("Вы уже оставляли отзыв этому работодателю", "info");
        resetForm();
        onSuccess();
        onClose();
        return;
      }
      setError(reviewErrorMessage(e, "Не удалось отправить отзыв"));
    } finally {
      setSaving(false);
    }
  }

  const title = companyName
    ? `Отзыв о ${companyName}`
    : "Отзыв о работодателе";

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      description="Оценка и комментарий помогут другим студентам. Отзыв нельзя изменить после отправки."
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" disabled={saving} onClick={handleClose}>
            Отмена
          </Button>
          <Button
            type="button"
            disabled={saving || rating < 1}
            onClick={() => void submit()}
          >
            {saving ? "Отправка…" : "Отправить"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Оценка</p>
          <StarRating value={rating} onChange={setRating} />
        </div>

        <Textarea
          label="Комментарий (необязательно)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={COMMENT_MAX}
          placeholder="Расскажите о вашем опыте…"
        />

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/80 bg-muted/20 px-4 py-3">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
          />
          <span className="text-sm leading-relaxed text-foreground">
            <span className="font-medium">Анонимный отзыв</span>
            <span className="mt-0.5 block text-muted-foreground">
              Имя не будет показано в публичном списке
            </span>
          </span>
        </label>

        {error ? (
          <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

type EmployerReviewStatusProps = {
  hasReviewed: boolean;
  employerUserId: string | null | undefined;
  companyName?: string | null;
  onReviewed: () => void;
  hint?: string;
  className?: string;
};

export function EmployerReviewStatus({
  hasReviewed,
  employerUserId,
  companyName,
  onReviewed,
  hint,
  className,
}: EmployerReviewStatusProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!employerUserId) return null;

  if (hasReviewed) {
    return (
      <div
        className={cn(
          "rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm font-medium text-success",
          className,
        )}
      >
        Отзыв отправлен
      </div>
    );
  }

  return (
    <>
      <div className={cn("space-y-2", className)}>
        {hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => setModalOpen(true)}
        >
          Оставить отзыв
        </Button>
      </div>

      <EmployerReviewModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        employerUserId={employerUserId}
        companyName={companyName}
        onSuccess={onReviewed}
      />
    </>
  );
}
