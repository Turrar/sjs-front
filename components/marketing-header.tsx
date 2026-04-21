"use client";

import Link from "next/link";
import {
  defaultDashboardPath,
  useSession,
} from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  const { user, loading } = useSession();
  const jobsHref =
    user?.role === "STUDENT" ? "/dashboard/jobs" : "/jobs";

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/80 bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-5 md:h-16 md:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-sm font-bold text-accent-foreground shadow-sm shadow-accent/25 transition-transform group-hover:scale-105"
            aria-hidden
          >
            S
          </span>
          <span>SJS</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <Link href={jobsHref}>
            <Button variant="ghost" className="text-sm">
              Вакансии
            </Button>
          </Link>
          {loading ? (
            <span className="px-3 text-sm text-muted-foreground">…</span>
          ) : user ? (
            <Link href={defaultDashboardPath(user.role)}>
              <Button variant="secondary" className="text-sm">
                Кабинет
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="text-sm">
                  Войти
                </Button>
              </Link>
              <Link href="/register">
                <Button className="text-sm">Регистрация</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
