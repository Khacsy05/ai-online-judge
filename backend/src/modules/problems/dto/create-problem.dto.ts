export class TestCaseDto {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

export class CreateProblemDto {
  title: string;
  description: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
  authorId?: string;
  testCases?: TestCaseDto[];
}
