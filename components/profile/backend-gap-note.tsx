type BackendGapNoteProps = {
  items: string[];
};

export function BackendGapNote({ items }: BackendGapNoteProps) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5">
      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
        Не хватает данных с сервера
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Передайте бэкенд-разработчику:
      </p>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2 leading-relaxed">
            <span className="shrink-0 text-amber-600" aria-hidden>
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
