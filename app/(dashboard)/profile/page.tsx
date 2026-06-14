"use client";

import { useSession } from "@/components/providers/session-provider";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { EmployerProfileContent } from "@/components/profile/employer-profile-content";
import { StudentProfileContent } from "@/components/profile/student-profile-content";

export default function ProfilePage() {
  const { user } = useSession();

  if (!user) return null;

  const isEmployer = user.role === "EMPLOYER";
  const isStudent = user.role === "STUDENT";

  return (
    <PageContainer className={isEmployer || isStudent ? "max-w-3xl" : undefined}>
      <PageHeader
        title={isEmployer ? "Профиль компании" : "Профиль"}
        description={
          isEmployer
            ? "Данные компании, логотип и уведомления — как вас видят студенты на вакансиях."
            : isStudent
              ? "Аватар, контакты и образование — как вас видят работодатели."
              : "Данные аккаунта по роли."
        }
      />

      {isEmployer ? (
        <EmployerProfileContent user={user} />
      ) : isStudent ? (
        <StudentProfileContent user={user} />
      ) : (
        <p className="rounded-xl border border-border bg-muted/50 px-4 py-4 text-sm text-muted-foreground">
          Редактирование профиля администратора здесь не требуется.
        </p>
      )}
    </PageContainer>
  );
}
