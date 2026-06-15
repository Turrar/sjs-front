import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import type { PresignResponse, ResumeDraft, UserMe } from "@/lib/types";

export type ApiPost = {
  post: <T>(path: string, body?: unknown) => Promise<T>;
};

export type ApiPatch = {
  patch: <T>(path: string, body?: unknown) => Promise<T>;
};

export type ApiPresignClient = ApiPost & ApiPatch;

export const LOGO_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const PDF_CONTENT_TYPE = "application/pdf" as const;

export function validatePdfFile(file: File): string | null {
  if (!file.name || file.name.length > 255) {
    return "Имя файла должно быть от 1 до 255 символов.";
  }
  const type = file.type || "";
  if (type !== PDF_CONTENT_TYPE) {
    return "Поддерживается только PDF.";
  }
  return null;
}

export function validateLogoFile(file: File): string | null {
  if (!file.name || file.name.length > 255) {
    return "Имя файла должно быть от 1 до 255 символов.";
  }
  const type = file.type || "";
  if (
    !LOGO_CONTENT_TYPES.includes(type as (typeof LOGO_CONTENT_TYPES)[number])
  ) {
    return "Поддерживаются PNG, JPEG и WebP.";
  }
  return null;
}

/**
 * POST /upload/presign (JWT, любая роль). Тело: filename, contentType.
 * Ответ: uploadUrl, storageKey, expiresIn.
 */
export async function requestPresign(
  api: ApiPost,
  file: File,
): Promise<PresignResponse> {
  return api.post<PresignResponse>(routes.upload.presign, {
    filename: file.name,
    contentType: file.type || "application/octet-stream",
  });
}

export async function putFileToPresignedUrl(
  uploadUrl: string,
  file: File,
): Promise<void> {
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!put.ok) {
    throw new Error("Не удалось загрузить файл в хранилище");
  }
}

/**
 * Presign → PUT в S3. Возвращает storageKey для каталога, расписания, профиля, резюме и т.д.
 */
export async function uploadFileViaPresign(
  api: ApiPost,
  file: File,
): Promise<string> {
  const presign = await requestPresign(api, file);
  await putFileToPresignedUrl(presign.uploadUrl, file);
  return presign.storageKey;
}

/**
 * Логотип работодателя: presign → PUT → PATCH /users/me.
 * Возвращает обновлённый профиль с logoUrl.
 */
export async function uploadCompanyLogo(
  api: ApiPresignClient,
  file: File,
): Promise<UserMe> {
  const validationError = validateLogoFile(file);
  if (validationError) {
    throw new Error(validationError);
  }
  const presign = await requestPresign(api, file);
  await putFileToPresignedUrl(presign.uploadUrl, file);
  try {
    return await api.patch<UserMe>(routes.users.me, {
      logoStorageKey: presign.storageKey,
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      throw new Error(
        "Нет прав привязать этот файл. Ключ должен начинаться с uploads/{yourUserId}/.",
      );
    }
    throw e;
  }
}

/** Снять логотип с профиля работодателя. */
export async function removeCompanyLogo(
  api: ApiPresignClient,
): Promise<UserMe> {
  return api.patch<UserMe>(routes.users.me, { logoStorageKey: null });
}

/** PDF резюме: presign → PUT → PATCH /resume/drafts/:id. */
export async function uploadResumePdf(
  api: ApiPresignClient,
  draftId: string,
  file: File,
): Promise<ResumeDraft> {
  const validationError = validatePdfFile(file);
  if (validationError) {
    throw new Error(validationError);
  }
  const presign = await requestPresign(api, file);
  await putFileToPresignedUrl(presign.uploadUrl, file);
  try {
    return await api.patch<ResumeDraft>(routes.resume.draftById(draftId), {
      pdfStorageKey: presign.storageKey,
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      throw new Error(
        "Нет прав привязать этот файл. Ключ должен начинаться с uploads/{yourUserId}/.",
      );
    }
    throw e;
  }
}
