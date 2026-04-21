"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useSession,
  defaultDashboardPath,
} from "@/components/providers/session-provider";
import type { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";

type NavItem = { href: string; label: string };

function navForRole(role: UserRole): NavItem[] {
  switch (role) {
    case "STUDENT":
      return [
        { href: "/dashboard", label: "Главная" },
        { href: "/dashboard/jobs", label: "Вакансии" },
        { href: "/applications", label: "Отклики" },
        { href: "/internships", label: "Стажировки" },
        { href: "/schedule", label: "Расписание" },
        { href: "/resume", label: "Резюме" },
        { href: "/skill-tests", label: "Тесты навыков" },
        { href: "/gamification", label: "Достижения" },
        { href: "/job-alerts", label: "Подписки" },
        { href: "/notifications", label: "Уведомления" },
        { href: "/profile", label: "Профиль" },
      ];
    case "EMPLOYER":
      return [
        { href: "/employer/analytics", label: "Аналитика" },
        { href: "/employer/jobs", label: "Мои вакансии" },
        { href: "/employer/internships", label: "Стажировки" },
        { href: "/employer/reviews", label: "Отзывы о нас" },
        { href: "/notifications", label: "Уведомления" },
        { href: "/profile", label: "Профиль" },
      ];
    case "ADMIN":
      return [
        { href: "/admin/analytics", label: "Аналитика" },
        { href: "/admin/users", label: "Пользователи" },
        { href: "/admin/catalog", label: "Справочники" },
        { href: "/notifications", label: "Уведомления" },
        { href: "/profile", label: "Профиль" },
      ];
    default:
      return [];
  }
}

const roleLabel: Record<UserRole, string> = {
  STUDENT: "Студент",
  EMPLOYER: "Работодатель",
  ADMIN: "Администратор",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useSession();
  const nav = user ? navForRole(user.role) : [];
  const homeHref = user ? defaultDashboardPath(user.role) : "/";

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="sticky top-0 z-30 flex w-full flex-shrink-0 flex-col border-b border-border bg-sidebar text-sidebar-foreground md:fixed md:inset-y-0 md:left-0 md:z-30 md:w-60 md:border-b-0 md:border-r md:border-border">
        <div className="flex h-14 items-center gap-3 border-b border-border px-4 md:h-16">
          <Link
            href={homeHref}
            className="group flex items-center gap-2 font-semibold tracking-tight text-foreground"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-xs font-bold text-accent-foreground shadow-sm shadow-accent/20 transition-transform group-hover:scale-105"
              aria-hidden
            >
              S
            </span>
            <span>SJS</span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-row gap-1 overflow-x-auto p-2.5 md:flex-col md:overflow-visible md:py-3">
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-card font-medium text-accent shadow-sm ring-1 ring-border"
                    : "text-sidebar-foreground hover:bg-muted/80"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-h-screen min-w-0 flex-1 flex-col md:ml-60">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border/80 bg-card/90 px-4 backdrop-blur-md md:h-16 md:px-8">
          <div className="min-w-0 text-sm text-muted-foreground">
            {user ? (
              <span className="truncate">
                <span className="font-medium text-foreground">
                  {user.email}
                </span>
                <span className="mx-2 text-border">·</span>
                {roleLabel[user.role]}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="text-sm" onClick={() => logout()}>
              Выйти
            </Button>
          </div>
        </header>
        <main className="flex-1 bg-background px-4 py-6 md:px-8 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
