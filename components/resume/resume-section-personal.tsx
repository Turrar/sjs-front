"use client";

import type { ResumePersonal } from "@/lib/resume-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type ResumeSectionPersonalProps = {
  value: ResumePersonal;
  onChange: (value: ResumePersonal) => void;
  onFillFromProfile?: () => void;
};

export function ResumeSectionPersonal({
  value,
  onChange,
  onFillFromProfile,
}: ResumeSectionPersonalProps) {
  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Контакты</CardTitle>
          <CardDescription>Имя и контакты в шапке резюме.</CardDescription>
        </div>
        {onFillFromProfile ? (
          <Button type="button" variant="secondary" onClick={onFillFromProfile}>
            Из профиля
          </Button>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            label="ФИО"
            value={value.fullName}
            onChange={(e) => onChange({ ...value, fullName: e.target.value })}
          />
        </div>
        <Input
          label="Email"
          type="email"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
        />
        <Input
          label="Телефон"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
        />
      </div>
    </Card>
  );
}
