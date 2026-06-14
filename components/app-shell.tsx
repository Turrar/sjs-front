"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Bell, Menu, X } from "lucide-react";
import { routes } from "@/lib/api-routes";
import {
  useSession,
  defaultDashboardPath,
} from "@/components/providers/session-provider";
import type { UnreadNotificationsResponse, UserRole } from "@/lib/types";
import { userRoleLabel } from "@/lib/user-display";
import { NOTIFICATION_POLL_MS } from "@/lib/notification-payload";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; badge?: number };

type NavSection = {
  label?: string;
  items: NavItem[];
};

function navSectionsForRole(role: UserRole): NavSection[] {
  switch (role) {
    case "STUDENT":
      return [
        { items: [{ href: "/dashboard", label: "Главная" }] },
        {
          label: "Работа",
          items: [
            { href: "/dashboard/jobs", label: "Вакансии" },
            { href: "/applications", label: "Отклики" },
            { href: "/internships", label: "Стажировки" },
            { href: "/job-alerts", label: "Подписки" },
          ],
        },
        {
          label: "Профиль",
          items: [
            { href: "/schedule", label: "Расписание" },
            { href: "/resume", label: "Резюме" },
            { href: "/skill-tests", label: "Тесты навыков" },
            { href: "/gamification", label: "Достижения" },
          ],
        },
        {
          items: [
            { href: "/notifications", label: "Уведомления" },
            { href: "/profile", label: "Профиль" },
          ],
        },
      ];
    case "EMPLOYER":
      return [
        {
          items: [
            { href: "/employer/analytics", label: "Аналитика" },
            { href: "/employer/jobs", label: "Мои вакансии" },
            { href: "/employer/internships", label: "Стажировки" },
            { href: "/employer/reviews", label: "Отзывы о нас" },
            { href: "/notifications", label: "Уведомления" },
            { href: "/profile", label: "Профиль" },
          ],
        },
      ];
    case "ADMIN":
      return [
        {
          items: [
            { href: "/admin/analytics", label: "Аналитика" },
            { href: "/admin/users", label: "Пользователи" },
            { href: "/admin/jobs", label: "Вакансии" },
            { href: "/admin/catalog", label: "Справочники" },
            { href: "/notifications", label: "Уведомления" },
            { href: "/profile", label: "Профиль" },
          ],
        },
      ];
    default:
      return [];
  }
}

function NavLinks({
  sections,
  pathname,
  unread,
  onNavigate,
  className,
}: {
  sections: NavSection[];
  pathname: string;
  unread: number;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <>
      {sections.map((section, si) => (
        <div key={si} className={si > 0 ? "mt-3 border-t border-border/60 pt-3" : ""}>
          {section.label ? (
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </p>
          ) : null}
          {section.items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href + "/"));
            const showBadge = item.href === "/notifications" && unread > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center justify-between gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-card font-medium text-accent shadow-sm ring-1 ring-border"
                    : "text-sidebar-foreground hover:bg-muted/80",
                  className,
                )}
              >
                <span>{item.label}</span>
                {showBadge ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold tabular-nums text-accent-foreground">
                    {unread > 99 ? "99+" : unread}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, api } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const navSections = user ? navSectionsForRole(user.role) : [];
  const homeHref = user ? defaultDashboardPath(user.role) : "/";

  const refreshUnread = useCallback(async () => {
    if (!user) {
      setUnread(0);
      return;
    }
    try {
      const res = await api.get<UnreadNotificationsResponse>(
        routes.notifications.unreadCount,
      );
      setUnread(res.unreadCount);
    } catch {
      /* ignore */
    }
  }, [api, user]);

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread, pathname]);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      void refreshUnread();
    }, NOTIFICATION_POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshUnread, user]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 z-30 hidden w-full flex-shrink-0 flex-col border-b border-border bg-sidebar text-sidebar-foreground md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-60 md:border-b-0 md:border-r">
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
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2.5 py-3">
          <NavLinks sections={navSections} pathname={pathname} unread={unread} />
        </nav>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col md:ml-60">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-card/90 px-4 backdrop-blur-md md:h-16 md:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm md:hidden"
              aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"}
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link href={homeHref} className="font-semibold tracking-tight md:hidden">
              SJS
            </Link>
            <div className="hidden min-w-0 text-sm text-muted-foreground md:block">
              {user ? (
                <span className="truncate">
                  <span className="font-medium text-foreground">{user.email}</span>
                  <span className="mx-2 text-border">·</span>
                  {userRoleLabel(user.role)}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 ? (
              <Link
                href="/notifications"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm md:hidden"
                aria-label={`Уведомления: ${unread} непрочитанных`}
              >
                <Bell className="h-5 w-5" aria-hidden />
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              </Link>
            ) : null}
            <Button variant="ghost" className="text-sm" onClick={() => logout()}>
              Выйти
            </Button>
          </div>
        </header>

        {/* Mobile drawer */}
        {mobileOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden"
              aria-label="Закрыть меню"
              onClick={() => setMobileOpen(false)}
            />
            <nav className="fixed inset-y-0 left-0 z-50 flex w-[min(280px,85vw)] flex-col gap-1 overflow-y-auto border-r border-border bg-sidebar p-3 pt-16 shadow-xl md:hidden">
              {user ? (
                <p className="mb-2 truncate px-2 text-xs text-muted-foreground">
                  {user.email} · {userRoleLabel(user.role)}
                </p>
              ) : null}
              <NavLinks
                sections={navSections}
                pathname={pathname}
                unread={unread}
                onNavigate={() => setMobileOpen(false)}
              />
            </nav>
          </>
        ) : null}

        <main className="flex-1 bg-background px-4 py-6 md:px-8 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
