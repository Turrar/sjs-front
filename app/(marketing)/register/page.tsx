"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api-base";
import {
  defaultDashboardPath,
  useSession,
} from "@/components/providers/session-provider";
import type { RegisterInput } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useSession();
  const [role, setRole] = useState<"STUDENT" | "EMPLOYER">("STUDENT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      let input: RegisterInput;
      if (role === "STUDENT") {
        input = {
          role: "STUDENT",
          email,
          password,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
        };
      } else {
        input = {
          role: "EMPLOYER",
          email,
          password,
          companyName,
        };
      }
      const me = await register(input);
      router.replace(defaultDashboardPath(me.role));
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Не удалось зарегистрироваться";
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
          <CardTitle className="text-xl sm:text-2xl">Регистрация</CardTitle>
          <CardDescription className="mt-2">
            Выберите роль и заполните данные.
          </CardDescription>
          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">Роль</span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: "STUDENT" as const, label: "Студент" },
                    { id: "EMPLOYER" as const, label: "Работодатель" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRole(opt.id)}
                    className={cn(
                      "rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
                      role === opt.id
                        ? "border-accent bg-accent/10 text-foreground ring-1 ring-accent/30"
                        : "border-border bg-card text-muted-foreground hover:border-border hover:bg-muted/60",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            {role === "STUDENT" ? (
              <>
                <Input
                  label="Имя"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <Input
                  label="Фамилия"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </>
            ) : (
              <Input
                label="Название компании"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            )}
            {error ? (
              <p
                className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending} className="mt-1 w-full py-3">
              {pending ? "Создание…" : "Зарегистрироваться"}
            </Button>
          </form>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <Link
              href="/login"
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              Войти
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
