export function PremiumBadge({ className }: { className?: string }) {
  return (
    <span
      className={
        className ??
        "rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-semibold text-amber-700"
      }
    >
      ★ Premium
    </span>
  );
}
