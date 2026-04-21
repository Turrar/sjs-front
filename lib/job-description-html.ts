/** Проверка «пустого» описания с учётом HTML из редактора */
export function isJobDescriptionEmpty(html: string): boolean {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length === 0;
}

/** Есть ли в строке HTML-теги (для выбора режима показа) */
export function jobDescriptionLooksLikeHtml(s: string): boolean {
  return /<[a-z][\s\S]*>/i.test(s.trim());
}

/**
 * Старое описание без тегов приводим к HTML для TipTap; уже HTML не трогаем.
 */
export function ensureJobDescriptionHtml(description: string): string {
  const t = description.trim();
  if (!t) return "<p></p>";
  if (jobDescriptionLooksLikeHtml(t)) return description;
  const escaped = description
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\r\n/g, "\n").split("\n").join("<br>")}</p>`;
}
