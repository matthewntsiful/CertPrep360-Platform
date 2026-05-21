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
  correct: string;
  domain?: string;
  explanation: string;
  resources: Resource[];
}

export interface ExamSession {
  examId: string;
  certId: string;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<number, string | string[]>;
  flaggedQuestions: Set<number>;
  timeLeft: number; // in seconds
  status: 'idle' | 'running' | 'paused' | 'completed';
  studyMode: boolean;
  startTime: number | null;
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
