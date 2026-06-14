"use client";

import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import type { MediaUrlResponse } from "@/lib/types";
import {
  removeCompanyLogo,
  uploadCompanyLogo,
  validateLogoFile,
} from "@/lib/presign-upload";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

type EmployerLogoModalProps = {
  open: boolean;
  onClose: () => void;
  logoUrl: string | null | undefined;
  logoStorageKey: string | null | undefined;
  onUpdated: () => void | Promise<void>;
};

export function EmployerLogoModal({
  open,
  onClose,
  logoUrl,
  logoStorageKey,
  onUpdated,
}: EmployerLogoModalProps) {
  const { api } = useSession();
  const toast = useToast();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(logoUrl ?? null);

  useEffect(() => {
    if (open) {
      setPreviewUrl(logoUrl ?? null);
      setLogoFile(null);
      setError(null);
    }
  }, [open, logoUrl]);

  const refreshPreviewUrl = useCallback(async () => {
    if (!logoStorageKey) return;
    try {
      const res = await api.get<MediaUrlResponse>(routes.media.url(logoStorageKey));
      setPreviewUrl(res.url);
    } catch {
      /* preview stays broken until next GET /users/me */
    }
  }, [api, logoStorageKey]);

  async function handleUpload() {
    if (!logoFile) return;
    const validationError = validateLogoFile(logoFile);
    if (validationError) {
      setError(validationError);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const me = await uploadCompanyLogo(api, logoFile);
      const url =
        me.profile && "logoUrl" in me.profile
          ? (me.profile as { logoUrl?: string | null }).logoUrl
          : null;
      setPreviewUrl(url ?? null);
      setLogoFile(null);
      await onUpdated();
      toast.success("Логотип обновлён");
      onClose();
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Ошибка загрузки логотипа";
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (!logoStorageKey && !logoUrl) return;
    if (!confirm("Удалить логотип компании?")) return;
    setRemoving(true);
    setError(null);
    try {
      await removeCompanyLogo(api);
      setPreviewUrl(null);
      setLogoFile(null);
      await onUpdated();
      toast.success("Логотип удалён");
      onClose();
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : "Не удалось удалить логотип";
      setError(msg);
      toast.error(msg);
    } finally {
      setRemoving(false);
    }
  }

  const hasLogo = Boolean(previewUrl || logoStorageKey);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Логотип компании"
      description="Квадратное изображение PNG, JPEG или WebP. Отображается на вакансиях."
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {hasLogo ? (
            <Button
              type="button"
              variant="ghost"
              className="text-danger"
              disabled={uploading || removing}
              onClick={() => void handleRemove()}
            >
              {removing ? "Удаление…" : "Удалить логотип"}
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button
            type="button"
            disabled={!logoFile || uploading || removing}
            onClick={() => void handleUpload()}
          >
            {uploading ? "Загрузка…" : "Сохранить"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-5">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Логотип компании"
            className="h-28 w-28 rounded-2xl border border-border object-cover shadow-sm"
            onError={() => void refreshPreviewUrl()}
          />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
            {hasLogo ? "Загружен" : "Нет логотипа"}
          </div>
        )}

        <label className="flex w-full min-h-[44px] cursor-pointer flex-col justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-center">
          <span className="text-sm font-medium text-foreground">
            {logoFile ? logoFile.name : "Выберите файл"}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            Нажмите, чтобы выбрать изображение
          </span>
          <input
            type="file"
            className="sr-only"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {error ? (
          <p className="w-full rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
