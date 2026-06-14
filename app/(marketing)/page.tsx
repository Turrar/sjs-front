import Link from "next/link";
import {
  Briefcase,
  Calendar,
  MessageSquare,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: UserPlus,
    title: "Создайте профиль",
    description:
      "Зарегистрируйтесь как студент или работодатель, заполните резюме и укажите навыки.",
  },
  {
    icon: Calendar,
    title: "Учитывайте расписание",
    description:
      "Добавьте пары и свободные слоты — подбор вакансий не будет конфликтовать с учёбой.",
  },
  {
    icon: Briefcase,
    title: "Найдите работу или стажировку",
    description:
      "Фильтруйте вакансии, откликайтесь в один клик и отслеживайте статус в личном кабинете.",
  },
  {
    icon: MessageSquare,
    title: "Общайтесь напрямую",
    description:
      "Переписка с работодателем, уведомления и чат по отклику — всё в одном приложении.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-accent/5 blur-3xl"
        aria-hidden
      />

      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col gap-20 px-5 py-16 md:gap-28 md:px-6 md:py-24">
        {/* Hero */}
        <section className="flex flex-col gap-10 md:gap-12">
          <div className="max-w-xl space-y-5">
            <p className="text-sm font-medium uppercase tracking-wider text-accent">
              Платформа для студентов
            </p>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-foreground md:text-5xl md:leading-[1.08]">
              Работа и стажировки без лишней суеты
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
              Ищите вакансии с учётом расписания, откликайтесь и общайтесь с
              работодателями в одном месте.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/register">
              <Button className="px-7 py-3 text-base">Создать аккаунт</Button>
            </Link>
            <Link href="/jobs">
              <Button variant="secondary" className="px-7 py-3 text-base">
                Смотреть вакансии
              </Button>
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Как это работает
            </h2>
            <p className="max-w-lg text-muted-foreground">
              Четыре шага от регистрации до первого отклика — без таблиц в Excel
              и бесконечных писем.
            </p>
          </div>
          <ol className="grid gap-4 sm:grid-cols-2">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="flex gap-4 rounded-2xl border border-border/90 bg-card p-5 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <step.icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Шаг {i + 1}
                  </p>
                  <h3 className="font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Features strip */}
        <section className="grid gap-4 rounded-2xl border border-border/90 bg-muted/30 p-6 sm:grid-cols-3 sm:p-8">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-2xl font-bold tabular-nums text-foreground">AI</p>
            <p className="text-sm text-muted-foreground">
              Подбор и оценка откликов для работодателей
            </p>
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-2xl font-bold tabular-nums text-foreground">24/7</p>
            <p className="text-sm text-muted-foreground">
              Уведомления о статусе откликов и сообщениях
            </p>
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-2xl font-bold tabular-nums text-foreground">KZ</p>
            <p className="text-sm text-muted-foreground">
              Вакансии и стажировки для студентов Казахстана
            </p>
          </div>
        </section>

        {/* App preview */}
        <section className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Всё в одном кабинете
            </h2>
            <p className="max-w-lg text-muted-foreground">
              Вакансии, отклики, чат и расписание — без переключения между сервисами.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { title: "Лента вакансий", hint: "Фильтры и match-score" },
              { title: "Мои отклики", hint: "Статусы и переписка" },
              { title: "Расписание", hint: "Пары и свободные слоты" },
            ].map((screen) => (
              <div
                key={screen.title}
                className="overflow-hidden rounded-2xl border border-border/90 bg-card shadow-sm"
              >
                <div className="border-b border-border/80 bg-muted/40 px-4 py-2">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-danger/40" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400/50" />
                    <span className="h-2.5 w-2.5 rounded-full bg-success/40" />
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  <div className="h-3 w-2/3 rounded-md bg-muted" />
                  <div className="h-20 rounded-xl bg-muted/60" />
                  <div className="h-3 w-1/2 rounded-md bg-muted" />
                  <div className="h-10 rounded-xl bg-accent/10" />
                  <p className="pt-1 text-sm font-medium text-foreground">{screen.title}</p>
                  <p className="text-xs text-muted-foreground">{screen.hint}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Partners */}
        <section className="space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              Нам доверяют
            </h2>
            <p className="text-sm text-muted-foreground">
              Университеты и компании, с которыми мы работаем над стажировками студентов.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            {["KBTU", "Nazarbayev Univ.", "Kaspi", "Halyk", "Astana Hub", "Tech Orda"].map(
              (name) => (
                <div
                  key={name}
                  className="flex h-12 min-w-[7rem] items-center justify-center rounded-xl border border-border/80 bg-card px-4 text-sm font-semibold text-muted-foreground shadow-sm"
                >
                  {name}
                </div>
              ),
            )}
          </div>
        </section>

        {/* Trust */}
        <section className="rounded-2xl border border-border/90 bg-card p-8 text-center shadow-sm md:p-10">
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            Почему студенты выбирают SJS
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground md:text-base">
            Платформа учитывает расписание, помогает с резюме и даёт прозрачную воронку
            отклика — от отправки до стажировки.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-2xl font-bold text-accent">100%</p>
              <p className="text-sm text-muted-foreground">бесплатно для студентов</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-accent">AI</p>
              <p className="text-sm text-muted-foreground">подбор вакансий и оценка откликов</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-accent">KZ</p>
              <p className="text-sm text-muted-foreground">фокус на рынок Казахстана</p>
            </div>
          </div>
        </section>

        {/* Employer CTA */}
        <section className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/10 via-card to-card p-8 md:p-10">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/15 blur-2xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-sm">
                <Sparkles className="h-6 w-6" aria-hidden />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground md:text-2xl">
                  Вы работодатель?
                </h2>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
                  Публикуйте вакансии и стажировки, получайте отклики с AI-оценкой
                  и ведите переписку со студентами в одном кабинете.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link href="/register">
                <Button className="px-6 py-2.5">Зарегистрировать компанию</Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" className="px-6 py-2.5">
                  Войти
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
