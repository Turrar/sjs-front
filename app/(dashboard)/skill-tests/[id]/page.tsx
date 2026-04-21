"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { ApiError } from "@/lib/api-base";
import { RoleGuard } from "@/components/role-guard";
import { useSession } from "@/components/providers/session-provider";
import type { SkillTestSubmitResult, SkillTestWithQuestions } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LoadingHint, PageContainer } from "@/components/layout/page";
import { cn } from "@/lib/cn";

export default function SkillTestPage() {
  const params = useParams();
  const testId = params.id as string;
  const { api } = useSession();

  const [test, setTest] = useState<SkillTestWithQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SkillTestSubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<SkillTestWithQuestions>(
        routes.skillTests.byId(testId),
      );
      setTest(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ошибка загрузки теста");
    } finally {
      setLoading(false);
    }
  }, [api, testId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitTest() {
    if (!test) return;
    const unanswered = test.questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      setSubmitError(
        `Ответьте на все вопросы. Пропущено: ${unanswered.length}`,
      );
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.post<SkillTestSubmitResult>(routes.skillTests.submit, {
        testId: test.id,
        answers,
      });
      setResult(res);
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : "Ошибка отправки");
    } finally {
      setSubmitting(false);
    }
  }

  const answeredCount = Object.keys(answers).length;
  const totalCount = test?.questions.length ?? 0;

  return (
    <RoleGuard allow={["STUDENT"]}>
      <PageContainer narrow>
        <div className="mb-6">
          <Link
            href="/skill-tests"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-accent"
          >
            ← Тесты навыков
          </Link>
        </div>

        {loading ? (
          <LoadingHint />
        ) : error ? (
          <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : test ? (
          result ? (
            /* Result screen */
            <Card className="text-center">
              <div
                className={cn(
                  "mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold tabular-nums",
                  result.passed
                    ? "bg-success/15 text-success"
                    : "bg-danger/10 text-danger",
                )}
              >
                {result.scorePercent}%
              </div>
              <CardTitle className="text-xl">
                {result.passed ? "Тест сдан!" : "Попробуйте ещё раз"}
              </CardTitle>
              <CardDescription className="mt-2">
                Правильных ответов: {result.correct} из {result.total}
                {result.passed
                  ? " · Бейдж добавлен в ваш профиль"
                  : ` · Нужно ${test.passThreshold}% для прохождения`}
              </CardDescription>
              <div className="mt-6 flex flex-col items-center gap-3">
                {result.passed ? null : (
                  <Button
                    type="button"
                    onClick={() => {
                      setResult(null);
                      setAnswers({});
                    }}
                  >
                    Пройти снова
                  </Button>
                )}
                <Link href="/skill-tests">
                  <Button variant="secondary">Все тесты</Button>
                </Link>
              </div>
            </Card>
          ) : (
            /* Test form */
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {test.skill}
                </h1>
                {test.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {test.description}
                  </p>
                ) : null}
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="rounded-md bg-muted/60 px-2 py-0.5">
                    {totalCount} вопросов
                  </span>
                  <span className="rounded-md bg-muted/60 px-2 py-0.5">
                    Порог: {test.passThreshold}%
                  </span>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 font-medium",
                      answeredCount === totalCount
                        ? "bg-success/10 text-success"
                        : "bg-muted/60",
                    )}
                  >
                    Отвечено: {answeredCount}/{totalCount}
                  </span>
                </div>
              </div>

              <ol className="space-y-5">
                {test.questions.map((q, qi) => (
                  <li key={q.id}>
                    <Card
                      className={cn(
                        "transition-[border-color]",
                        answers[q.id]
                          ? "border-accent/25"
                          : "border-border",
                      )}
                    >
                      <p className="mb-4 text-sm font-semibold text-foreground">
                        <span className="mr-2 font-mono text-muted-foreground">
                          {qi + 1}.
                        </span>
                        {q.question}
                      </p>
                      <div className="space-y-2">
                        {q.options.map((opt) => {
                          const selected = answers[q.id] === opt.id;
                          return (
                            <label
                              key={opt.id}
                              className={cn(
                                "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
                                selected
                                  ? "border-accent/50 bg-accent/10 text-accent"
                                  : "border-border bg-muted/30 text-foreground hover:border-accent/30 hover:bg-muted/50",
                              )}
                            >
                              <input
                                type="radio"
                                name={`q-${q.id}`}
                                value={opt.id}
                                checked={selected}
                                onChange={() =>
                                  setAnswers((prev) => ({
                                    ...prev,
                                    [q.id]: opt.id,
                                  }))
                                }
                                className="shrink-0 accent-accent"
                              />
                              {opt.text}
                            </label>
                          );
                        })}
                      </div>
                    </Card>
                  </li>
                ))}
              </ol>

              {submitError ? (
                <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                  {submitError}
                </p>
              ) : null}

              <div className="flex items-center justify-between gap-4">
                <Link href="/skill-tests">
                  <Button variant="ghost">Отмена</Button>
                </Link>
                <Button
                  type="button"
                  disabled={submitting || answeredCount !== totalCount}
                  onClick={() => void submitTest()}
                >
                  {submitting
                    ? "Проверка…"
                    : answeredCount !== totalCount
                      ? `Ответьте на все (${totalCount - answeredCount} осталось)`
                      : "Отправить ответы"}
                </Button>
              </div>
            </div>
          )
        ) : null}
      </PageContainer>
    </RoleGuard>
  );
}
