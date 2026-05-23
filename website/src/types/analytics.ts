/**
 * Analytics types for the Study Mode Enhancements feature.
 * Covers score trend visualization, paginated history, attempt details,
 * and adaptive quiz interfaces.
 */

/** A single data point in the score trend chart. */
export interface TrendDataPoint {
  /** ISO timestamp of the attempt */
  date: string;
  /** Score percentage (0-100) */
  score: number;
  /** Certification identifier (e.g. "SAA-C03") */
  certId: string;
  /** Exam identifier within the certification */
  examId: string;
  /** Per-domain accuracy percentages for this attempt */
  domainScores: Record<string, number>;
}

/** Summary of a single exam attempt, used in history lists and trend data. */
export interface AttemptSummary {
  /** Unique attempt identifier */
  id: string;
  /** Exam identifier */
  examId: string;
  /** Certification identifier */
  certId: string;
  /** Score percentage (0-100) */
  score: number;
  /** ISO timestamp of the attempt */
  date: string;
  /** Time taken in minutes */
  timeTaken: number;
  /** Whether the attempt met the 72% pass threshold */
  passed: boolean;
}

/** Full question snapshot stored with an attempt record. */
export interface QuestionSnapshot {
  /** Question identifier */
  q_id: string;
  /** Full question text */
  text: string;
  /** Answer options keyed by letter (e.g. { A: "...", B: "..." }) */
  options: Record<string, string>;
  /** Correct answer key (e.g. "A") */
  correct: string;
  /** Explanation of the correct answer */
  explanation: string;
  /** Domain this question belongs to */
  domain: string;
}

/** Enhanced analytics response from GET /analytics (dashboard summary). */
export interface AnalyticsResponse {
  /** Total number of completed exams */
  examsCompleted: number;
  /** Average score across all attempts */
  averageScore: number;
  /** Total study hours tracked */
  totalStudyHours: number;
  /** Domain with the lowest accuracy */
  weakestDomain: string;
  /** List of certification IDs the user has attempted */
  certificationsTracked: string[];
  /** Number of questions in the user's Weak Pool (spaced repetition) */
  weakPoolCount: number;
  /** Chronologically ordered trend data for the score chart */
  trendData: TrendDataPoint[];
  /** Most recent attempts for quick display */
  recentAttempts: AttemptSummary[];
}

/** Paginated history response from GET /analytics?history=true. */
export interface PaginatedHistoryResponse {
  /** Attempts for the current page */
  attempts: AttemptSummary[];
  /** Total number of attempts matching the current filters */
  totalCount: number;
  /** Opaque cursor for fetching the next page, null if no more pages */
  nextCursor: string | null;
}

/** Parameters for fetching paginated history. */
export interface HistoryParams {
  /** Number of items per page (default 20, max 50) */
  pageSize?: number;
  /** Opaque cursor from a previous response */
  cursor?: string | null;
  /** Filter by certification ID */
  certId?: string;
  /** Filter by pass/fail status */
  status?: 'passed' | 'failed';
  /** Sort order for results */
  sort?: 'newest' | 'oldest' | 'score_asc' | 'score_desc';
}

/** Detailed attempt response including question snapshots. */
export interface AttemptDetailResponse {
  /** Attempt metadata */
  id: string;
  examId: string;
  certId: string;
  score: number;
  date: string;
  timeTaken: number;
  passed: boolean;
  /** Per-domain accuracy for this attempt */
  domainScores: Record<string, number>;
  /** User's answers keyed by question index */
  answers: Record<string, {
    q_id: string;
    domain: string;
    selected: string | null;
    isCorrect: boolean;
  }>;
  /** Full question snapshots (may be absent for legacy attempts) */
  questionSnapshots?: QuestionSnapshot[];
}

/** Response from the dynamic quiz API with adaptive/multi-domain mode. */
export interface DynamicQuizResponse {
  /** Quiz generation mode */
  mode: 'single-domain' | 'adaptive' | 'multi-domain';
  /** Domains included in this quiz */
  domains: string[];
  /** Number of questions returned */
  count: number;
  /** Total questions available matching criteria */
  totalAvailable: number;
  /** Number of spaced-repetition questions mixed in */
  weakPoolIncluded: number;
  /** The quiz questions */
  questions: Array<{
    q_id: string;
    text: string;
    options: Record<string, string>;
    correct: string;
    explanation: string;
    resources: Array<{ type: string; url: string }>;
    domain: string;
    cert_id: string;
    exam_id: string;
    primary_service?: string;
  }>;
}
