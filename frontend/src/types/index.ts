export type TestCase = {
  id?: string;
  input: string;
  expectedOutput: string;
};

export type Assignment = {
  assignmentId: string;
  problemId: string;
  problemTitle: string;
  problemDescription?: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
  testCases?: TestCase[];
  startTime: string;
  deadline: string;
  attemptCount: number;
  bestScore: number;
  latestScore?: number;
  maxPossibleScore: number;
  isSolved: boolean;
  latestStatus: string; // 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'RUNTIME_ERROR' | 'COMPILATION_ERROR' | 'PENDING' | 'RUNNING' | 'NOT_SUBMITTED'
};

export type ClassroomProgress = {
  classroomId: string;
  classroomCode: string;
  classroomName: string;
  studentTotalScore: number;
  maxClassScore: number;
  totalAssignments: number;
  solvedCount: number;
  progressPercentage: number;
  assignments: Assignment[];
};

export * from "./submission";
export * from "./auth";
export * from "./classroom";
