import Link from "next/link";
import { Button } from "@/components/ui/button";

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
      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-12 px-5 py-16 md:gap-16 md:px-6 md:py-24">
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
      </main>
    </div>
  );
}
