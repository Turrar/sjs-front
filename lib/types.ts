export type UserRole = "STUDENT" | "EMPLOYER" | "ADMIN";

export type JobStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "PAUSED"
  | "CLOSED"
  | "ARCHIVED";

export type ApplicationStatus =
  | "SUBMITTED"
  | "REVIEWING"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN";

export type EmployerVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type WorkWindow = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

export type StudentProfile = {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  university: string | null;
  specialty: string | null;
  bio: string | null;
  portfolioUrl: string | null;
  timezone: string | null;
  /** После POST /upload/presign + PUT — ключ в PATCH /users/me */
  avatarStorageKey?: string | null;
  githubUsername?: string | null;
  /** Реальный chat_id не возвращается — только маска или null */
  telegramChatId?: string | null;
};

export type EmployerProfile = {
  companyName: string;
  description: string | null;
  website: string | null;
  verificationStatus: EmployerVerificationStatus;
  logoStorageKey?: string | null;
  telegramChatId?: string | null;
};

export type UserMe = {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  profile?: StudentProfile | EmployerProfile | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

/** Ответ 200 POST /upload/presign — тело: filename, contentType (MIME) */
export type PresignResponse = {
  uploadUrl: string;
  storageKey: string;
  expiresIn: number;
};

/** Справочник: город (админ / GET /cities) */
export type City = {
  id: string;
  name: string;
  /** Локализованные названия, например { ru, kk } */
  nameI18n?: Record<string, string> | null;
  slug: string | null;
  imageStorageKey?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

/** Справочник: категория вакансий (админ) */
export type JobCategory = {
  id: string;
  name: string;
  slug: string | null;
  parentId: string | null;
  imageStorageKey?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

/** Справочник: тег (админ) */
export type Tag = {
  id: string;
  name: string;
  slug: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Job = {
  id: string;
  title: string;
  description: string;
  status: JobStatus;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  requiredWeeklyHours: number | null;
  workWindows: WorkWindow[] | null;
  cityId?: string | null;
  categoryIds?: string[] | null;
  tagIds?: string[] | null;
  isPremium?: boolean;
  /** GET /jobs, GET /jobs/:id — связи из каталога */
  city?: City | null;
  categories?: JobCategory[] | null;
  tags?: Tag[] | null;
  employerUserId?: string;
  employer?: { companyName?: string | null } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Application = {
  id: string;
  jobId: string;
  studentUserId: string;
  status: ApplicationStatus;
  coverLetter: string | null;
  employerScore?: number | null;
  job?: Job;
  student?: { id: string; email: string };
  studentProfile?: StudentProfile | null;
};

export type ScheduleSource = {
  id: string;
  studentProfileId: string;
  storageKey: string;
  mimeType: string;
  parseStatus: string;
  createdAt?: string;
};

export type ScheduleSlot = {
  id: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  label: string | null;
  updatedAt?: string;
};

/** PATCH /schedule/slots/:id — частичное обновление */
export type ScheduleSlotPatch = Partial<{
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  label: string | null;
}>;

export type Message = {
  id: string;
  roomId: string;
  body: string;
  createdAt: string;
  sender?: { id: string; email: string };
};

/** GET /notifications — kind из enum на бэкенде */
export type NotificationKind =
  | "APPLICATION_UPDATE"
  | "CHAT_MESSAGE"
  | "SCHEDULE_READY"
  | "SYSTEM";

/** Payload APPLICATION_UPDATE: у работодателя — новый отклик; у студента — смена статуса */
export type NotificationPayloadApplicationUpdateEmployer = {
  applicationId: string;
  jobId: string;
  message: string;
};

export type NotificationPayloadApplicationUpdateStudent = {
  applicationId: string;
  jobId: string;
  status: string;
};

export type NotificationPayloadChatMessage = {
  applicationId: string;
  messageId: string;
  preview: string;
};

export type Notification = {
  id: string;
  userId: string;
  /** Значения enum на бэкенде; при появлении новых — строка */
  kind: NotificationKind | string;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

/** GET/POST/PATCH/DELETE /resume/drafts — только STUDENT; список по updatedAt убыв. */
export type ResumeDraft = {
  id: string;
  studentProfileId: string;
  title: string | null;
  contentJson: Record<string, unknown>;
  pdfStorageKey?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** POST /resume/drafts — 201; без профиля студента → 403 */
export type ResumeDraftCreate = {
  /** Обязательно — произвольная структура на фронте */
  contentJson: Record<string, unknown>;
  /** До 200 символов */
  title?: string | null;
  pdfStorageKey?: string | null;
};

/** PATCH /resume/drafts/:id — частично; pdfStorageKey: null отвязывает PDF */
export type ResumeDraftPatch = Partial<{
  title: string | null;
  contentJson: Record<string, unknown>;
  pdfStorageKey: string | null;
}>;

export type AdminUserRow = {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
};

export type PlatformAnalytics = {
  usersByRole: { role: string; count: string }[];
  publishedJobs: number;
  totalApplications: number;
};

export type EmployerAnalytics = {
  jobs: number;
  applications: number;
};

/** Ответ GET /catalog/job-form */
export type JobFormCatalog = {
  cities: City[];
  jobCategories: JobCategory[];
  tags: Tag[];
};

// ─── Job с AI-совпадением ─────────────────────────────────────────────────────

/** GET /jobs/recommended — вакансия + matchScore 0–100 */
export type JobWithMatchScore = Job & { matchScore?: number };

// ─── Job Alerts ───────────────────────────────────────────────────────────────

/** GET/POST/PATCH/DELETE /job-alerts — подписки студента на новые вакансии */
export type JobAlert = {
  id: string;
  studentUserId: string;
  cityId: string | null;
  categoryId: string | null;
  tagIds: string[];
  q: string | null;
  isActive: boolean;
  lastNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type JobAlertCreate = Partial<{
  cityId: string;
  categoryId: string;
  tagIds: string[];
  q: string;
}>;

export type JobAlertPatch = JobAlertCreate & { isActive?: boolean };

// ─── Skill Tests ──────────────────────────────────────────────────────────────

/** GET /skill-tests — список активных тестов */
export type SkillTest = {
  id: string;
  skill: string;
  description: string | null;
  passThreshold: number;
  isActive: boolean;
  createdAt?: string;
};

/** Вариант ответа в вопросе теста (без поля правильного ответа) */
export type SkillTestOption = { id: string; text: string };

/** GET /skill-tests/:id — тест с вопросами */
export type SkillTestWithQuestions = SkillTest & {
  questions: {
    id: string;
    question: string;
    options: SkillTestOption[];
  }[];
};

/** POST /skill-tests/submit — ответ с результатом */
export type SkillTestSubmitResult = {
  scorePercent: number;
  passed: boolean;
  correct: number;
  total: number;
  resultId: string;
};

/** GET /skill-tests/badges/me (или /badges/user/:userId) */
export type SkillBadge = {
  id: string;
  skill: string;
  scorePercent: number;
  testId: string;
  createdAt: string;
  updatedAt: string;
};

/** GET /skill-tests/results/me — история попыток */
export type SkillTestResult = {
  id: string;
  testId: string;
  scorePercent: number;
  passed: boolean;
  createdAt: string;
  test?: Pick<SkillTest, "skill" | "passThreshold">;
};

// ─── Gamification ─────────────────────────────────────────────────────────────

export type GamificationHistoryEntry = {
  id: string;
  event: string;
  points: number;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

/** GET /gamification/me */
export type GamificationMe = {
  total: number;
  history: GamificationHistoryEntry[];
};

/** GET /gamification/leaderboard */
export type LeaderboardEntry = {
  userId: string;
  total: number;
  email?: string;
};

// ─── Internships ──────────────────────────────────────────────────────────────

export type InternshipStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";
export type InternshipTaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type InternshipLogEntry = {
  id: string;
  internshipId: string;
  date: string;
  hours: number;
  description: string | null;
  createdAt?: string;
};

export type InternshipTask = {
  id: string;
  internshipId: string;
  title: string;
  description: string | null;
  status: InternshipTaskStatus;
  dueDate: string | null;
  createdAt?: string;
};

export type Internship = {
  id: string;
  applicationId: string;
  studentUserId: string;
  employerUserId: string;
  status: InternshipStatus;
  employerFeedback: string | null;
  employerRating: number | null;
  createdAt: string;
  updatedAt: string;
  logEntries?: InternshipLogEntry[];
  tasks?: InternshipTask[];
  application?: {
    job?: Pick<Job, "id" | "title"> | null;
    student?: { id: string; email: string } | null;
  };
};

// ─── Public Profile ───────────────────────────────────────────────────────────

export type GitHubRepo = {
  name: string;
  description: string | null;
  url: string;
  stars: number;
  language: string | null;
  updatedAt: string;
};

/** GET /profiles/:userId — публично, без JWT */
export type PublicProfile = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  university: string | null;
  specialty: string | null;
  bio: string | null;
  portfolioUrl: string | null;
  avatarStorageKey: string | null;
  githubUsername: string | null;
  githubRepos: GitHubRepo[];
  createdAt: string;
};

// ─── Employer Reviews ─────────────────────────────────────────────────────────

export type EmployerReview = {
  id: string;
  rating: number;
  comment: string | null;
  isAnonymous: boolean;
  createdAt: string;
  reviewer: { userId: string; firstName: string | null; lastName: string | null } | null;
};

export type EmployerReviewsResponse = {
  employerUserId: string;
  companyName: string | null;
  avgRating: number;
  reviewCount: number;
  reviews: EmployerReview[];
};

// ─── Kaspi Payment ────────────────────────────────────────────────────────────

/** POST /payments/kaspi/premium/:jobId */
export type KaspiPaymentResponse = {
  orderId: string;
  paymentUrl: string;
  amount: number;
  currency: string;
};

// ─── AI responses ─────────────────────────────────────────────────────────────

export type CoverLetterResponse = { text: string };
export type InterviewPrepResponse = { questions: string[] };
export type ResumeSuggestionsResponse = Record<string, unknown>;
