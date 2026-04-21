import { routes } from "@/lib/api-routes";
import type { PresignResponse } from "@/lib/types";

export type ApiPost = {
  post: <T>(path: string, body?: unknown) => Promise<T>;
};

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
