import type { AiHealthResponse, HealthCheckItem, HealthResponse } from "@/lib/types";

const HEALTH_CHECK_LABELS: Record<string, string> = {
  database: "База данных",
  redis: "Redis",
  memory_heap: "Оперативная память",
  disk: "Диск",
};

export function healthCheckLabel(key: string): string {
  return HEALTH_CHECK_LABELS[key] ?? key.replace(/_/g, " ");
}

export function healthCheckStatusLabel(status: string): string {
  if (status === "up") return "Доступен";
  if (status === "down") return "Недоступен";
  return status;
}

export function healthCheckBadgeVariant(
  status: string,
): "success" | "danger" | "muted" {
  if (status === "up") return "success";
  if (status === "down") return "danger";
  return "muted";
}

export function apiHealthOverallLabel(status: string): string {
  if (status === "ok") return "Все системы работают";
  if (status === "error") return "Есть проблемы";
  return status;
}

export function apiHealthOverallVariant(
  status: string,
): "success" | "danger" | "muted" {
  if (status === "ok") return "success";
  if (status === "error") return "danger";
  return "muted";
}

export function extractHealthChecks(
  health: HealthResponse,
): { key: string; label: string; status: string }[] {
  const source = health.details ?? health.info ?? {};
  return Object.entries(source).map(([key, item]) => ({
    key,
    label: healthCheckLabel(key),
    status: (item as HealthCheckItem).status ?? "unknown",
  }));
}

export function aiModuleLabel(module?: string): string {
  if (!module) return "AI-модуль";
  if (module === "AiModule") return "AI-модуль";
  return module;
}

export function aiEmbeddingsStatus(
  embeddings: AiHealthResponse["openaiEmbeddings"],
): { label: string; variant: "success" | "danger" | "muted"; model: string | null } {
  if (!embeddings) {
    return { label: "Не настроен", variant: "muted", model: null };
  }
  if (embeddings.configured) {
    return {
      label: "Настроен",
      variant: "success",
      model: embeddings.model ?? null,
    };
  }
  return {
    label: "Не настроен",
    variant: "danger",
    model: embeddings.model ?? null,
  };
}
