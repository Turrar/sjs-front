"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/components/providers/session-provider";
import { SessionLoadingSkeleton } from "@/components/ui/skeleton";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-3 px-4">
        <SessionLoadingSkeleton />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
