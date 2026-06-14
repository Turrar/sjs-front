import { routes } from "@/lib/api-routes";
import type { KaspiPremiumStatusResponse } from "@/lib/types";

export type ApiGet = <T>(path: string) => Promise<T>;

export type PollKaspiOptions = {
  jobId: string;
  api: ApiGet;
  maxAttempts?: number;
  intervalMs?: number;
  signal?: AbortSignal;
};

export type PollKaspiResult =
  | { ok: true; status: KaspiPremiumStatusResponse }
  | { ok: false; reason: "timeout" | "aborted" | "error"; message?: string };

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export async function pollKaspiPremiumStatus({
  jobId,
  api,
  maxAttempts = 12,
  intervalMs = 5000,
  signal,
}: PollKaspiOptions): Promise<PollKaspiResult> {
  for (let i = 0; i < maxAttempts; i++) {
    if (signal?.aborted) return { ok: false, reason: "aborted" };

    try {
      const status = await api<KaspiPremiumStatusResponse>(
        routes.payments.kaspiPremiumStatus(jobId),
      );
      if (status.isPremium) {
        return { ok: true, status };
      }
    } catch (e) {
      if (signal?.aborted) return { ok: false, reason: "aborted" };
      if (i === maxAttempts - 1) {
        return {
          ok: false,
          reason: "error",
          message: e instanceof Error ? e.message : "Ошибка проверки оплаты",
        };
      }
    }

    if (i < maxAttempts - 1) {
      try {
        await sleep(intervalMs, signal);
      } catch {
        return { ok: false, reason: "aborted" };
      }
    }
  }

  return { ok: false, reason: "timeout" };
}

export function interviewPrepPath(opts: {
  jobId: string;
  language?: string;
  count?: number;
}): string {
  const params = new URLSearchParams({ jobId: opts.jobId });
  if (opts.language) params.set("language", opts.language);
  if (opts.count != null) params.set("count", String(opts.count));
  return `${routes.ai.interviewPrep}?${params}`;
}
