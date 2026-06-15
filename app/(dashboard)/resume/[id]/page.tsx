"use client";

import { useParams } from "next/navigation";
import { RoleGuard } from "@/components/role-guard";
import { ResumeEditor } from "@/components/resume/resume-editor";

export default function ResumeEditorPage() {
  const params = useParams();
  const draftId = params.id as string;

  return (
    <RoleGuard allow={["STUDENT"]}>
      <ResumeEditor draftId={draftId} />
    </RoleGuard>
  );
}
