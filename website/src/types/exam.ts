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
