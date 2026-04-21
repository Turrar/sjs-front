/**
 * Реестр путей REST API (относительно `getApiBase()`, т.е. …/api/… на сервере).
 * Новые вызовы — только через этот модуль, чтобы фронт оставался согласованным с бэкендом.
 */

export const routes = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    logout: "/auth/logout",
    refresh: "/auth/refresh",
  },
  users: {
    me: "/users/me",
  },
  jobs: {
    list: "/jobs",
    recommended: "/jobs/recommended",
    mine: "/jobs/mine",
    byId: (id: string) => `/jobs/${id}`,
  },
  applications: {
    create: "/applications",
    mine: "/applications/me",
    byJob: (jobId: string) => `/applications/job/${jobId}`,
    patchStatus: (id: string) => `/applications/${id}/status`,
  },
  chat: {
    messages: (applicationId: string) =>
      `/chat/applications/${applicationId}/messages`,
  },
  notifications: {
    list: "/notifications",
    markRead: (id: string) => `/notifications/${id}/read`,
  },
  schedule: {
    sources: "/schedule/sources",
    slots: "/schedule/slots",
    slotById: (id: string) => `/schedule/slots/${id}`,
  },
  /**
   * Резюме-черновики: базовый путь на бэкенде `/api/resume` (здесь без префикса — его даёт getApiBase).
   * JWT + STUDENT; без student profile → 403 на GET/POST.
   */
  resume: {
    drafts: "/resume/drafts",
    draftById: (id: string) => `/resume/drafts/${id}`,
    suggestions: (id: string) => `/resume/drafts/${id}/suggestions`,
  },
  /** POST: тело { filename, contentType } → { uploadUrl, storageKey, expiresIn } */
  upload: {
    presign: "/upload/presign",
  },
  analytics: {
    platform: "/analytics/platform",
    employerMe: "/analytics/employer/me",
  },
  admin: {
    users: (page: number, limit: number) =>
      `/admin/users?page=${page}&limit=${limit}`,
    employerVerification: (userId: string) =>
      `/admin/employers/${userId}/verification`,
    moderateJob: (jobId: string) => `/admin/jobs/${jobId}/moderate`,
    /** POST /admin/hh-import?text=...&area=... */
    hhImport: (text?: string, area?: string) => {
      const params = new URLSearchParams();
      if (text) params.set("text", text);
      if (area) params.set("area", area);
      const qs = params.toString();
      return qs ? `/admin/hh-import?${qs}` : "/admin/hh-import";
    },
  },
  ai: {
    health: "/ai/health",
    coverLetter: "/ai/cover-letter",
    interviewPrep: "/ai/interview-prep",
  },
  /** Публичные списки справочников (таблицы на /admin/catalog) */
  catalog: {
    cities: "/cities",
    jobCategories: "/job-categories",
    tags: "/tags",
    /** Данные для формы создания/редактирования вакансии одним запросом */
    jobForm: "/catalog/job-form",
  },
  jobAlerts: {
    list: "/job-alerts",
    create: "/job-alerts",
    byId: (id: string) => `/job-alerts/${id}`,
  },
  skillTests: {
    list: "/skill-tests",
    byId: (id: string) => `/skill-tests/${id}`,
    submit: "/skill-tests/submit",
    badgesMe: "/skill-tests/badges/me",
    badgesByUser: (userId: string) => `/skill-tests/badges/user/${userId}`,
    resultsMe: "/skill-tests/results/me",
  },
  gamification: {
    me: "/gamification/me",
    leaderboard: "/gamification/leaderboard",
  },
  internships: {
    mine: "/internships/mine",
    create: "/internships",
    byId: (id: string) => `/internships/${id}`,
    createTask: (id: string) => `/internships/${id}/tasks`,
    complete: (id: string) => `/internships/${id}/complete`,
    log: (id: string) => `/internships/${id}/log`,
    totalHours: (id: string) => `/internships/${id}/total-hours`,
    patchTask: (taskId: string) => `/internships/tasks/${taskId}`,
  },
  payments: {
    kaspiPremium: (jobId: string) => `/payments/kaspi/premium/${jobId}`,
  },
  profiles: {
    byUserId: (userId: string) => `/profiles/${userId}`,
  },
  reviews: {
    create: "/reviews",
    byEmployer: (employerUserId: string) => `/reviews/employer/${employerUserId}`,
  },
  calendar: {
    ics: "/calendar/schedule.ics",
  },
  video: {
    createRoom: (applicationId: string) => `/video/rooms/${applicationId}`,
  },
  /** Админские CRUD справочников (GET возвращает ВСЕ, включая неактивные) */
  adminCatalog: {
    cities: "/admin/cities",
    cityById: (id: string) => `/admin/cities/${id}`,
    jobCategories: "/admin/job-categories",
    jobCategoryById: (id: string) => `/admin/job-categories/${id}`,
    tags: "/admin/tags",
    tagById: (id: string) => `/admin/tags/${id}`,
  },
} as const;

/** GET /jobs с query (фильтры маркетинговой витрины) */
export function jobsListPath(searchParams: URLSearchParams): string {
  const qs = searchParams.toString();
  return qs ? `${routes.jobs.list}?${qs}` : routes.jobs.list;
}
