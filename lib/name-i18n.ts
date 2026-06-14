/** Собрать nameI18n для API из полей формы */
export function buildNameI18n(fields: {
  ru?: string;
  kk?: string;
  en?: string;
}): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  if (fields.ru?.trim()) out.ru = fields.ru.trim();
  if (fields.kk?.trim()) out.kk = fields.kk.trim();
  if (fields.en?.trim()) out.en = fields.en.trim();
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Распаковать nameI18n в поля формы */
export function parseNameI18n(
  i18n?: Record<string, string> | null,
): { ru: string; kk: string; en: string } {
  return {
    ru: i18n?.ru ?? "",
    kk: i18n?.kk ?? "",
    en: i18n?.en ?? "",
  };
}
