export type JudgeStatus =
  | "PENDING"
  | "RUNNING"
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "RUNTIME_ERROR"
  | "COMPILATION_ERROR"
  | "CANCELLED";

export type SubmissionLanguage =
  | "cpp"
  | "python"
  | "java"
  | "javascript"
  | "typescript"
  | "go";

export interface SubmitCodePayload {
  file: File;
  assignmentId: string;
}

export interface SubmissionQuery {
  userId?: string;
  assignmentId?: string;
  search?: string;
  status?: string;
  language?: string;
  page?: number;
  limit?: number;
}

export interface SubmissionStats {
  total: number;
  acceptedCount: number;
  rate: number;
  avgScore: string;
}

export interface PaginatedSubmissionsResponse {
  data: SubmissionListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  stats?: SubmissionStats | null;
}

export interface Submission {
  id: string;
  userId: string;
  assignmentId: string;
  language: string;
  sourceCode?: string;
  totalScore: number;
  status: JudgeStatus;
  feedback?: string | null;
  executionTimeMs?: number | null;
  memoryUsedKb?: number | null;
  createdAt: string;
  updatedAt?: string;
}

export interface SubmissionListItem extends Submission {
  user: {
    id: string;
    fullName: string;
    studentCode: string | null;
  };
  assignment: {
    id: string;
    problem: {
      id: string;
      title: string;
    };
  };
}

export interface SubmissionDetail {
  id: string;
  submissionId: string;
  testCaseId: string;
  status: JudgeStatus;
  actualOutput?: string | null;
  errorMessage?: string | null;
  executionTimeMs?: number | null;
  memoryUsedKb?: number | null;
  score: number;
  testCase: {
    id: string;
    isHidden: boolean;
    score: number;
  };
}

export interface SubmissionDetailResponse extends Submission {
  user: {
    id: string;
    fullName: string;
    studentCode: string | null;
  };
  assignment: {
    id: string;
    classroomId: string;
    problemId: string;
    startTime: string;
    deadline: string;
    problem: {
      id: string;
      title: string;
      description: string;
      timeLimitMs: number;
      memoryLimitMb: number;
    };
    classroom: {
      id: string;
      code: string;
      name: string;
    };
  };
  details: SubmissionDetail[];
}

export interface GradingFinishedEvent {
  submissionId: string;
  assignmentId: string;
  classroomId: string;
  status: JudgeStatus;
  totalScore: number;
  executionTimeMs: number;
  memoryUsedKb: number;
  feedback: string;
  studentTotalScore: number;
  maxClassScore: number;
  totalAssignments: number;
  solvedCount: number;
  progressPercentage: number;
}
