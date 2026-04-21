"use client";

import { RoleGuard } from "@/components/role-guard";
import { JobDetailContent } from "@/components/jobs/job-detail-content";

export default function StudentJobDetailInCabinetPage() {
  return (
    <RoleGuard allow={["STUDENT"]}>
      <JobDetailContent jobsListHref="/dashboard/jobs" />
    </RoleGuard>
  );
}
