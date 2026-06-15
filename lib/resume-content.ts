import type { StudentProfile, UserMe } from "@/lib/types";

export type ResumePersonal = {
  fullName: string;
  email: string;
  phone: string;
};

export type ResumeEducation = {
  school: string;
  degree: string;
  year: string;
};

export type ResumeExperience = {
  company: string;
  role: string;
  bullets: string[];
};

export type ResumeLanguage = {
  name: string;
  level: string;
};

export type ResumeContent = {
  personal: ResumePersonal;
  summary: string;
  education: ResumeEducation[];
  experience: ResumeExperience[];
  skills: string[];
  languages: ResumeLanguage[];
};

export const TITLE_MAX = 200;
export const SUMMARY_MIN = 50;

export type ResumeValidationResult = {
  valid: boolean;
  issues: string[];
};

function studentProfileFromUser(user: UserMe): StudentProfile | null {
  if (user.profile && "firstName" in user.profile) {
    return user.profile as StudentProfile;
  }
  return null;
}

export function emptyResumeContent(user: UserMe): ResumeContent {
  const profile = studentProfileFromUser(user);
  const fullName = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    personal: {
      fullName,
      email: user.email,
      phone: profile?.phone ?? "",
    },
    summary: profile?.bio ?? "",
    education:
      profile?.university || profile?.specialty
        ? [
            {
              school: profile?.university ?? "",
              degree: profile?.specialty ?? "",
              year: "",
            },
          ]
        : [],
    experience: [],
    skills: [],
    languages: [],
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function normalizePersonal(raw: unknown): ResumePersonal {
  if (!raw || typeof raw !== "object") {
    return { fullName: "", email: "", phone: "" };
  }
  const obj = raw as Record<string, unknown>;
  return {
    fullName: asString(obj.fullName),
    email: asString(obj.email),
    phone: asString(obj.phone),
  };
}

function normalizeEducation(raw: unknown): ResumeEducation[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const obj = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      school: asString(obj.school),
      degree: asString(obj.degree),
      year: asString(obj.year),
    };
  });
}

function normalizeExperience(raw: unknown): ResumeExperience[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const obj = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      company: asString(obj.company),
      role: asString(obj.role),
      bullets: asStringArray(obj.bullets),
    };
  });
}

function normalizeLanguages(raw: unknown): ResumeLanguage[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const obj = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      name: asString(obj.name),
      level: asString(obj.level),
    };
  });
}

/** Миграция произвольного contentJson в типизированную схему фронта. */
export function normalizeResumeContent(raw: Record<string, unknown>): ResumeContent {
  return {
    personal: normalizePersonal(raw.personal),
    summary: asString(raw.summary),
    education: normalizeEducation(raw.education),
    experience: normalizeExperience(raw.experience),
    skills: asStringArray(raw.skills),
    languages: normalizeLanguages(raw.languages),
  };
}

export function resumeContentToRecord(content: ResumeContent): Record<string, unknown> {
  return {
    personal: { ...content.personal },
    summary: content.summary,
    education: content.education.map((e) => ({ ...e })),
    experience: content.experience.map((e) => ({
      company: e.company,
      role: e.role,
      bullets: [...e.bullets],
    })),
    skills: [...content.skills],
    languages: content.languages.map((l) => ({ ...l })),
  };
}

export function personalFromProfile(user: UserMe): ResumePersonal {
  return emptyResumeContent(user).personal;
}

export function defaultDraftTitle(user: UserMe): string {
  const profile = studentProfileFromUser(user);
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();
  return name ? `Резюме ${name}` : "Новое резюме";
}

/** Профиль студента: имя и вуз — для осмысленного резюме и AI */
export function isStudentProfileReadyForResume(user: UserMe): boolean {
  const profile = studentProfileFromUser(user);
  return Boolean(profile?.firstName?.trim() && profile?.university?.trim());
}

function hasValidEducation(content: ResumeContent): boolean {
  return content.education.some((e) => e.school.trim().length > 0);
}

function hasValidSkills(content: ResumeContent): boolean {
  return content.skills.some((s) => s.trim().length > 0);
}

/** Проверка перед POST/PATCH — бэкенд принимает {}, фронт блокирует «пустое» резюме */
export function validateResumeForSave(
  content: ResumeContent,
  user: UserMe,
  title: string,
): ResumeValidationResult {
  const issues: string[] = [];

  if (!isStudentProfileReadyForResume(user)) {
    issues.push("В профиле укажите имя и вуз");
  }
  if (!title.trim()) {
    issues.push("Название черновика");
  } else if (title.trim().length > TITLE_MAX) {
    issues.push(`Название не длиннее ${TITLE_MAX} символов`);
  }
  if (content.summary.trim().length < SUMMARY_MIN) {
    issues.push(`«О себе» — минимум ${SUMMARY_MIN} символов`);
  }
  if (!hasValidSkills(content)) {
    issues.push("Минимум один навык");
  }
  if (!hasValidEducation(content)) {
    issues.push("Минимум одна запись об образовании (вуз)");
  }

  return { valid: issues.length === 0, issues };
}

export function canSaveResume(
  content: ResumeContent,
  user: UserMe,
  title: string,
): boolean {
  return validateResumeForSave(content, user, title).valid;
}
