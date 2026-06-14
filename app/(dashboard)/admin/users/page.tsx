"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type { AdminUserRow, EmployerVerificationStatus, UserRole } from "@/lib/types";
import { verificationStatusBadge } from "@/lib/employer-display";
import {
  USER_ROLE_OPTIONS,
  userRoleBadgeVariant,
  userRoleFilterLabel,
  userRoleLabel,
} from "@/lib/user-display";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { BackendGapNote } from "@/components/profile/backend-gap-note";
import { EmptyState, PageContainer, PageHeader } from "@/components/layout/page";
import { SimpleListSkeleton } from "@/components/ui/skeleton";

type UsersResponse = {
  data: AdminUserRow[];
  total: number;
  page: number;
  limit: number;
};

const verificationOptions: EmployerVerificationStatus[] = [
  "PENDING",
  "VERIFIED",
  "REJECTED",
];

type VerifyingState = { userId: string; status: EmployerVerificationStatus } | null;

function formatRegisteredAt(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function employerCompanyLabel(companyName: string | null | undefined): string {
  const name = companyName?.trim();
  return name || "—";
}

export default function AdminUsersPage() {
  const { api } = useSession();
  const [page, setPage] = useState(1);
  const limit = 20;
  const [result, setResult] = useState<UsersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [verifying, setVerifying] = useState<VerifyingState>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<UsersResponse>(
        routes.admin.users(page, limit, roleFilter || undefined),
      );
      setResult(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [api, page, limit, roleFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter]);

  async function setEmployerVerification(
    userId: string,
    status: EmployerVerificationStatus,
  ) {
    setVerifying({ userId, status });
    setActionError(null);
    try {
      await api.patch(routes.admin.employerVerification(userId), { status });
      await load();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Ошибка");
    } finally {
      setVerifying(null);
    }
  }

  async function toggleUserActive(userId: string, isActive: boolean) {
    setTogglingUserId(userId);
    setActionError(null);
    try {
      await api.patch(routes.admin.userStatus(userId), { isActive });
      await load();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Ошибка");
    } finally {
      setTogglingUserId(null);
    }
  }

  const rows = result?.data ?? [];
  const totalPages = result ? Math.ceil(result.total / limit) : 1;

  const backendGaps = useMemo(() => {
    if (roleFilter !== "EMPLOYER" && roleFilter !== "") return [];
    const employers = rows.filter((u) => u.role === "EMPLOYER");
    if (employers.length === 0) return [];
    const fieldMissing = employers.every((u) => u.companyName === undefined);
    if (!fieldMissing) return [];
    return [
      "GET /admin/users — для role=EMPLOYER добавить companyName в ответ.",
    ];
  }, [rows, roleFilter]);

  return (
    <RoleGuard allow={["ADMIN"]}>
      <PageContainer>
        <PageHeader
          title="Пользователи"
          description="Аккаунты платформы и верификация работодателей."
          action={
            <div className="flex flex-wrap items-end gap-3">
              <Select
                label="Роль"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | "")}
                wrapperClassName="min-w-[160px]"
              >
                <option value="">Все роли</option>
                {USER_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              {result ? (
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {result.total}
                </span>
              ) : null}
              <Button type="button" variant="secondary" onClick={() => void load()}>
                Обновить
              </Button>
            </div>
          }
        />

        <BackendGapNote items={backendGaps} />

        {actionError ? (
          <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {actionError}
          </p>
        ) : null}

        {error ? (
          <p className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {loading ? (
          <SimpleListSkeleton count={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Нет пользователей"
            description={
              roleFilter
                ? `По фильтру «${userRoleFilterLabel(roleFilter)}» ничего не найдено.`
                : "Список аккаунтов пуст."
            }
          />
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {rows.map((u) => (
                <li key={u.id}>
                  {u.role === "EMPLOYER" ? (
                    <EmployerUserCard
                      user={u}
                      verifying={verifying}
                      togglingUserId={togglingUserId}
                      onVerify={setEmployerVerification}
                      onToggleActive={toggleUserActive}
                    />
                  ) : (
                    <DefaultUserCard
                      user={u}
                      togglingUserId={togglingUserId}
                      onToggleActive={toggleUserActive}
                    />
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-3 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Показано {rows.length} из {result?.total ?? 0}
                {roleFilter ? ` · ${userRoleFilterLabel(roleFilter)}` : ""}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Назад
                </Button>
                <span className="min-w-[5rem] text-center text-sm text-muted-foreground">
                  {page} / {totalPages || 1}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!result || page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Вперёд
                </Button>
              </div>
            </div>
          </>
        )}

        <p className="mt-8 text-sm text-muted-foreground">
          Модерация вакансий — на странице{" "}
          <Link href="/admin/jobs" className="font-medium text-accent hover:underline">
            Вакансии
          </Link>
          .
        </p>
      </PageContainer>
    </RoleGuard>
  );
}

function EmployerVerificationActions({
  userId,
  currentStatus,
  verifying,
  onVerify,
}: {
  userId: string;
  currentStatus: EmployerVerificationStatus;
  verifying: VerifyingState;
  onVerify: (userId: string, status: EmployerVerificationStatus) => Promise<void>;
}) {
  const isLoading = verifying?.userId === userId;

  return (
    <div className="flex flex-col gap-1.5 sm:items-end">
      <span className="text-xs font-medium text-muted-foreground">Верификация</span>
      <div className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-muted/20 p-1">
        {verificationOptions.map((status) => {
          const isCurrent = status === currentStatus;
          const badge = verificationStatusBadge(status);
          const loadingThis = isLoading && verifying?.status === status;
          return (
            <button
              key={status}
              type="button"
              disabled={isLoading || isCurrent}
              onClick={() => void onVerify(userId, status)}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-default",
                isCurrent
                  ? cn(badge.className, "shadow-sm")
                  : "text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-50",
              )}
            >
              {loadingThis ? "…" : badge.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmployerUserCard({
  user,
  verifying,
  togglingUserId,
  onVerify,
  onToggleActive,
}: {
  user: AdminUserRow;
  verifying: VerifyingState;
  togglingUserId: string | null;
  onVerify: (userId: string, status: EmployerVerificationStatus) => Promise<void>;
  onToggleActive: (userId: string, isActive: boolean) => Promise<void>;
}) {
  const isToggling = togglingUserId === user.id;
  const verificationStatus = user.verificationStatus ?? "PENDING";
  const companyLabel = employerCompanyLabel(user.companyName);
  const companyTitle = user.companyName?.trim() ?? null;

  return (
    <Card
      padding={false}
      className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-foreground" title={companyLabel}>
            {companyTitle ? (
              <Link
                href={`/employers/${user.id}`}
                className="hover:text-accent hover:underline"
              >
                {companyTitle}
              </Link>
            ) : (
              <span className="text-muted-foreground">{companyLabel}</span>
            )}
          </p>
          <Badge variant="amber">Работодатель</Badge>
          <Badge variant={user.isActive ? "success" : "muted"}>
            {user.isActive ? "Активен" : "Отключён"}
          </Badge>
        </div>
        <p className="truncate text-sm text-muted-foreground" title={user.email}>
          {user.email} · {formatRegisteredAt(user.createdAt)}
        </p>
      </div>

      <EmployerVerificationActions
        userId={user.id}
        currentStatus={verificationStatus}
        verifying={verifying}
        onVerify={onVerify}
      />

      <div className="flex shrink-0 items-center sm:justify-end">
        <Button
          type="button"
          variant={user.isActive ? "ghost" : "secondary"}
          className={user.isActive ? "text-danger" : undefined}
          disabled={isToggling}
          onClick={() => void onToggleActive(user.id, !user.isActive)}
        >
          {isToggling ? "…" : user.isActive ? "Отключить" : "Включить"}
        </Button>
      </div>
    </Card>
  );
}

function DefaultUserCard({
  user,
  togglingUserId,
  onToggleActive,
}: {
  user: AdminUserRow;
  togglingUserId: string | null;
  onToggleActive: (userId: string, isActive: boolean) => Promise<void>;
}) {
  const isToggling = togglingUserId === user.id;

  return (
    <Card
      padding={false}
      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-foreground" title={user.email}>
            {user.email}
          </p>
          <Badge variant={userRoleBadgeVariant(user.role)}>
            {userRoleLabel(user.role)}
          </Badge>
          <Badge variant={user.isActive ? "success" : "muted"}>
            {user.isActive ? "Активен" : "Отключён"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Зарегистрирован {formatRegisteredAt(user.createdAt)}
        </p>
      </div>

      <Button
        type="button"
        variant={user.isActive ? "ghost" : "secondary"}
        className={user.isActive ? "text-danger" : undefined}
        disabled={isToggling}
        onClick={() => void onToggleActive(user.id, !user.isActive)}
      >
        {isToggling ? "…" : user.isActive ? "Отключить" : "Включить"}
      </Button>
    </Card>
  );
}
