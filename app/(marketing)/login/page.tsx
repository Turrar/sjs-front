"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api-base";
import {
  defaultDashboardPath,
  useSession,
} from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const me = await login(email, password);
      router.replace(defaultDashboardPath(me.role));
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Не удалось войти";
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,var(--color-accent)_0%,transparent_55%)] opacity-[0.12]"
        aria-hidden
      />
      <Card
        padding={false}
        className="relative w-full max-w-md overflow-hidden border-border/80 shadow-[var(--shadow-soft)]"
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-accent/80 via-accent to-accent/70" />
        <div className="px-6 pb-8 pt-8 sm:px-8">
          <CardTitle className="text-xl sm:text-2xl">Вход</CardTitle>
          <CardDescription className="mt-2">
            Введите email и пароль, чтобы продолжить.
          </CardDescription>
          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Пароль"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            {error ? (
              <p
                className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending} className="mt-1 w-full py-3">
              {pending ? "Вход…" : "Войти"}
            </Button>
          </form>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Нет аккаунта?{" "}
            <Link
              href="/register"
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              Регистрация
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
