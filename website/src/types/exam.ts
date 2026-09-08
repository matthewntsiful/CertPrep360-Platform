export interface Resource {
  type: string;
  url: string;
}

export interface Question {
  q_id: string;
  cert_id: string;
  exam_id: string;
  text: string;
  options: Record<string, string>;
  /** Present only after server-scored completion or in an explicit study flow. */
  correct?: string | string[];
  /** Number of selections required; safe to expose during an exam. */
  answerCount?: number;
  domain?: string;
  explanation?: string;
  resources?: Resource[];
}

export interface ExamSession {
  examId: string;
  certId: string;
  attemptId: string | null;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<number, string | string[]>;
  flaggedQuestions: Set<number>;
  timeLeft: number; // in seconds
  status: 'idle' | 'loading' | 'running' | 'paused' | 'submitting' | 'completed' | 'error';
  studyMode: boolean;
  startTime: number | null;
  submissionError: string | null;
  result: ExamResult | null;
}

export interface ExamResult {
  attemptId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  timeTaken: number;
  passed: boolean;
  passingScore: number;
  domainScores: Record<string, number>;
  answers: Record<string, {
    q_id: string;
    domain: string;
    selected: string | string[] | null;
    isCorrect: boolean;
    correct: string[];
    explanation: string;
    resources: Resource[];
  }>;
}

export interface JobStatus {
  job_id: string;
  cert_id: string;
  exam_id: string;
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  questions_generated: number;
  questions_skipped: number;
  current_domain: string;
  started_at: string;
  completed_at: string | null;
  error: string | null;
}

export interface DomainBreakdown {
  domain: string;
  actual_pct: number;
  target_pct: number;
}

export interface ServiceBreakdown {
  service: string;
  count: number;
  pct: number;
}

export interface QualityReport {
  exam_id: string;
  cert_id: string;
  generated_at: string;
  result: 'PASS' | 'WARN' | 'FAIL';
  domain_balance_score: number;
  service_diversity_score: number;
  duplicate_rate: number;
  warnings: string[];
  failures: string[];
  domain_breakdown: DomainBreakdown[];
  service_breakdown: ServiceBreakdown[];
  uncovered_services: string[];
  uncovered_task_statements: string[];
}
