"use client";

import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type { AdminUserRow, EmployerVerificationStatus, UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LoadingHint, PageContainer, PageHeader } from "@/components/layout/page";

type UsersResponse = {
  data: AdminUserRow[];
  total: number;
  page: number;
  limit: number;
};

const verificationOptions: EmployerVerificationStatus[] = ["PENDING", "VERIFIED", "REJECTED"];

const verificationStyle: Record<EmployerVerificationStatus, string> = {
  PENDING:  "bg-amber-500/10 text-amber-700",
  VERIFIED: "bg-success/10 text-success",
  REJECTED: "bg-danger/10 text-danger",
};
const verificationLabel: Record<EmployerVerificationStatus, string> = {
  PENDING:  "На проверке",
  VERIFIED: "Верифицирован",
  REJECTED: "Отклонён",
};

const roleStyle: Record<UserRole, string> = {
  STUDENT:  "bg-accent/10 text-accent",
  EMPLOYER: "bg-amber-500/10 text-amber-700",
  ADMIN:    "bg-violet-500/10 text-violet-700",
};

const selectClass =
  "rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/25";

type VerifyingState = { userId: string; status: EmployerVerificationStatus } | null;

export default function AdminUsersPage() {
  const { api } = useSession();
  const [page, setPage] = useState(1);
  const limit = 20;
  const [result, setResult] = useState<UsersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [verifying, setVerifying] = useState<VerifyingState>(null);

  // Job moderation
  const [jobId, setJobId] = useState("");
  const [moderateStatus, setModerateStatus] = useState<"PAUSED" | "ARCHIVED">("PAUSED");
  const [modError, setModError] = useState<string | null>(null);
  const [modSuccess, setModSuccess] = useState<string | null>(null);
  const [modLoading, setModLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<UsersResponse>(routes.admin.users(page, limit));
      setResult(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [api, page, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPage(1);
  }, [roleFilter]);

  async function setEmployerVerification(userId: string, status: EmployerVerificationStatus) {
    setVerifying({ userId, status });
    try {
      await api.patch(routes.admin.employerVerification(userId), { status });
      await load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Ошибка");
    } finally {
      setVerifying(null);
    }
  }

  async function moderateJob() {
    const id = jobId.trim();
    if (!id) return;
    setModError(null);
    setModSuccess(null);
    setModLoading(true);
    try {
      await api.patch(routes.admin.moderateJob(id), { status: moderateStatus });
      setJobId("");
      setModSuccess(`Статус вакансии обновлён → ${moderateStatus}`);
    } catch (e) {
      setModError(e instanceof ApiError ? e.message : "Ошибка");
    } finally {
      setModLoading(false);
    }
  }

  const rows = result?.data ?? [];
  const filtered = roleFilter ? rows.filter((u) => u.role === roleFilter) : rows;
  const totalPages = result ? Math.ceil(result.total / limit) : 1;

  return (
    <RoleGuard allow={["ADMIN"]}>
      <PageContainer>
        <PageHeader
          title="Пользователи"
          description="Список аккаунтов, верификация работодателей и модерация вакансий."
        />

        {/* Job moderation */}
        <Card className="mb-8">
          <CardTitle as="h2" className="mb-1">Модерация вакансии</CardTitle>
          <CardDescription className="mb-5">
            PATCH /admin/jobs/:id/moderate — допустимые статусы: PAUSED и ARCHIVED.
          </CardDescription>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[220px] flex-1">
              <Input
                label="UUID вакансии"
                value={jobId}
                onChange={(e) => { setJobId(e.target.value); setModSuccess(null); setModError(null); }}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Действие</span>
              <select
                className={selectClass}
                value={moderateStatus}
                onChange={(e) => setModerateStatus(e.target.value as "PAUSED" | "ARCHIVED")}
              >
                <option value="PAUSED">Приостановить (PAUSED)</option>
                <option value="ARCHIVED">Архивировать (ARCHIVED)</option>
              </select>
            </div>
            <Button
              type="button"
              disabled={modLoading || !jobId.trim()}
              onClick={() => void moderateJob()}
            >
              {modLoading ? "Применение…" : "Применить"}
            </Button>
          </div>
          {modError && (
            <p className="mt-3 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              {modError}
            </p>
          )}
          {modSuccess && (
            <p className="mt-3 rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
              {modSuccess}
            </p>
          )}
        </Card>

        {/* Users table */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Пользователи</h2>
            {result && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {result.total}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Роль</span>
              <select
                className={selectClass}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | "")}
              >
                <option value="">Все роли</option>
                <option value="STUDENT">STUDENT</option>
                <option value="EMPLOYER">EMPLOYER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className="flex items-end gap-2 pb-0.5">
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Назад
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages || 1}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={!result || page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперёд →
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        {loading ? (
          <LoadingHint />
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-border/90 shadow-sm ring-1 ring-black/[0.03]">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="p-4 font-semibold text-foreground">Email</th>
                    <th className="p-4 font-semibold text-foreground">Роль</th>
                    <th className="p-4 font-semibold text-foreground">Активен</th>
                    <th className="p-4 font-semibold text-foreground">Зарегистрирован</th>
                    <th className="p-4 font-semibold text-foreground">Верификация</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr
                      key={u.id}
                      className="border-t border-border/80 transition-colors hover:bg-muted/30"
                    >
                      <td className="p-4">
                        <span className="font-medium text-foreground">{u.email}</span>
                        <span className="ml-2 font-mono text-xs text-muted-foreground">
                          {u.id.slice(0, 8)}…
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleStyle[u.role] ?? "bg-muted text-muted-foreground"}`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            u.isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {u.isActive ? "Да" : "Нет"}
                        </span>
                      </td>
                      <td className="p-4 tabular-nums text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString("ru", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-4">
                        {u.role === "EMPLOYER" ? (
                          <EmployerVerificationCell
                            userId={u.id}
                            verifying={verifying}
                            onVerify={setEmployerVerification}
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">
                        Нет пользователей{roleFilter ? ` с ролью ${roleFilter}` : ""} на этой странице.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Страница {page} · показано {filtered.length} из {result?.total ?? 0} записей
              {roleFilter ? ` (фильтр по роли: ${roleFilter})` : ""}
            </p>
          </>
        )}
      </PageContainer>
    </RoleGuard>
  );
}

function EmployerVerificationCell({
  userId,
  verifying,
  onVerify,
}: {
  userId: string;
  verifying: VerifyingState;
  onVerify: (userId: string, status: EmployerVerificationStatus) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const isLoading = verifying?.userId === userId;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        Сменить статус
        <span className="text-[10px]">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="flex flex-wrap gap-1">
          {verificationOptions.map((v) => (
            <button
              key={v}
              type="button"
              disabled={isLoading}
              onClick={() => { void onVerify(userId, v); setOpen(false); }}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${verificationStyle[v]} hover:opacity-80 disabled:opacity-50`}
            >
              {isLoading && verifying?.status === v ? "…" : verificationLabel[v]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
