"use client";

import { RoleGuard } from "@/components/role-guard";
import { JobsBrowseContent } from "@/components/jobs/jobs-browse-content";

/** Вакансии внутри кабинета студента — с боковой панелью AppShell */
export default function StudentJobsInCabinetPage() {
  return (
    <RoleGuard allow={["STUDENT"]}>
      <JobsBrowseContent detailBasePath="/dashboard/jobs" />
    </RoleGuard>
  );
}
