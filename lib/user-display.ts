import type { UserRole } from "@/lib/types";

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: "Студент",
  EMPLOYER: "Работодатель",
  ADMIN: "Администратор",
};

export const USER_ROLE_BADGE_VARIANT: Record<
  UserRole,
  "accent" | "amber" | "violet"
> = {
  STUDENT: "accent",
  EMPLOYER: "amber",
  ADMIN: "violet",
};

export const USER_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "STUDENT", label: USER_ROLE_LABELS.STUDENT },
  { value: "EMPLOYER", label: USER_ROLE_LABELS.EMPLOYER },
  { value: "ADMIN", label: USER_ROLE_LABELS.ADMIN },
];

export function userRoleLabel(role: UserRole): string {
  return USER_ROLE_LABELS[role] ?? role;
}

export function userRoleBadgeVariant(
  role: UserRole,
): (typeof USER_ROLE_BADGE_VARIANT)[UserRole] {
  return USER_ROLE_BADGE_VARIANT[role];
}

export function userRoleFilterLabel(role: UserRole | ""): string {
  if (!role) return "Все роли";
  return userRoleLabel(role);
}
