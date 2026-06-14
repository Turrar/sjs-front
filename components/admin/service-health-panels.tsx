import type { AiHealthResponse, HealthResponse } from "@/lib/types";
import {
  aiEmbeddingsStatus,
  aiModuleLabel,
  apiHealthOverallLabel,
  apiHealthOverallVariant,
  extractHealthChecks,
  healthCheckBadgeVariant,
  healthCheckStatusLabel,
} from "@/lib/health-display";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function HealthCheckGrid({ health }: { health: HealthResponse }) {
  const checks = extractHealthChecks(health);

  if (checks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Детальные проверки не вернулись с сервера.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {checks.map((check) => (
        <div
          key={check.key}
          className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/25 px-4 py-3"
        >
          <span className="text-sm font-medium text-foreground">{check.label}</span>
          <Badge variant={healthCheckBadgeVariant(check.status)}>
            {healthCheckStatusLabel(check.status)}
          </Badge>
        </div>
      ))}
    </div>
  );
}

export function ApiHealthPanel({
  health,
  loading,
  error,
}: {
  health: HealthResponse | null;
  loading?: boolean;
  error: string | null;
}) {
  if (error) {
    return (
      <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
        {error}
      </p>
    );
  }

  if (loading || !health) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={apiHealthOverallVariant(health.status)}>
          {apiHealthOverallLabel(health.status)}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Статус: {health.status}
        </span>
      </div>
      <HealthCheckGrid health={health} />
    </div>
  );
}

export function AiHealthPanel({
  health,
  loading,
  error,
}: {
  health: AiHealthResponse | null;
  loading?: boolean;
  error: string | null;
}) {
  if (error) {
    return (
      <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
        {error}
      </p>
    );
  }

  if (loading || !health) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    );
  }

  const embeddings = aiEmbeddingsStatus(health.openaiEmbeddings);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          {aiModuleLabel(health.module)}
        </span>
        <Badge variant="accent">Активен</Badge>
      </div>

      <div className="rounded-xl border border-border/70 bg-muted/25 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">OpenAI Embeddings</p>
            <p className="text-xs text-muted-foreground">
              Подбор вакансий и семантический поиск
            </p>
          </div>
          <Badge variant={embeddings.variant}>{embeddings.label}</Badge>
        </div>
        {embeddings.model ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Модель: <span className="font-medium text-foreground">{embeddings.model}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
