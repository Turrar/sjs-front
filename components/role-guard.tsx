"use client";

import type { UserRole } from "@/lib/types";
import Link from "next/link";
import {
  defaultDashboardPath,
  useSession,
} from "@/components/providers/session-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page";

export function RoleGuard({
  allow,
  children,
}: {
  allow: UserRole[];
  children: React.ReactNode;
}) {
  const { user, loading } = useSession();

  if (loading || !user) {
    return null;
  }

  if (!allow.includes(user.role)) {
    return (
      <PageContainer narrow>
        <Card className="text-center">
          <p className="text-foreground">Нет доступа к этой странице.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ваш аккаунт: {user.role}. Откройте разделы, доступные вашей роли.
          </p>
          <Link
            href={defaultDashboardPath(user.role)}
            className="mt-6 inline-block"
          >
            <Button>На главную кабинета</Button>
          </Link>
        </Card>
      </PageContainer>
    );
  }

  return <>{children}</>;
}
