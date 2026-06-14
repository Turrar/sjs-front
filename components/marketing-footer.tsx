import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/80 bg-card/50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-12 md:px-6 md:py-14">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-xs font-bold text-accent-foreground">
                S
              </span>
              SJS
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Платформа стажировок и подработок для студентов Казахстана с учётом
              расписания и AI-подбором.
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Студентам</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/jobs" className="transition-colors hover:text-accent">
                  Вакансии
                </Link>
              </li>
              <li>
                <Link href="/register" className="transition-colors hover:text-accent">
                  Регистрация
                </Link>
              </li>
              <li>
                <Link href="/login" className="transition-colors hover:text-accent">
                  Вход
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Работодателям</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/register" className="transition-colors hover:text-accent">
                  Разместить вакансию
                </Link>
              </li>
              <li>
                <Link href="/login" className="transition-colors hover:text-accent">
                  Кабинет компании
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} SJS — Student Job Search</p>
          <p>Сделано для студентов Казахстана</p>
        </div>
      </div>
    </footer>
  );
}
