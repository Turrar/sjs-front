import { Input } from "@/components/ui/input";

type NameI18nFieldsProps = {
  ru: string;
  kk: string;
  en: string;
  onRu: (v: string) => void;
  onKk: (v: string) => void;
  onEn: (v: string) => void;
};

export function NameI18nFields({
  ru,
  kk,
  en,
  onRu,
  onKk,
  onEn,
}: NameI18nFieldsProps) {
  return (
    <div className="grid gap-3 md:col-span-2 md:grid-cols-3">
      <Input
        label="Название (ru)"
        value={ru}
        onChange={(e) => onRu(e.target.value)}
        placeholder="Опционально"
      />
      <Input
        label="Название (kk)"
        value={kk}
        onChange={(e) => onKk(e.target.value)}
        placeholder="Опционально"
      />
      <Input
        label="Название (en)"
        value={en}
        onChange={(e) => onEn(e.target.value)}
        placeholder="Optional"
      />
    </div>
  );
}
