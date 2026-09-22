import apiClient from "@/lib/apiClient";

export interface ProblemItem {
  id: string;
  title: string;
  description: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  createdAt: string;
  _count?: {
    testCases: number;
    assignments: number;
    submissions?: number;
  };
  author?: {
    id: string;
    fullName: string;
  };
}

export interface TestCaseItem {
  id?: string;
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

export interface ProblemDetailResponse extends ProblemItem {
  testCases: TestCaseItem[];
}

export interface CreateProblemPayload {
  title: string;
  description: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
  testCases?: Array<{
    input: string;
    expectedOutput: string;
    isHidden?: boolean;
  }>;
}

export interface UpdateProblemPayload {
  title?: string;
  description?: string;
  timeLimitMs?: number;
  memoryLimitMb?: number;
  testCases?: Array<{
    id?: string;
    input: string;
    expectedOutput: string;
    isHidden?: boolean;
  }>;
}

export interface QueryProblemsParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedProblemsResponse {
  items: ProblemItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Lấy danh sách ngân hàng đề bài tập (Problem Bank) kèm phân trang
 */
export async function getProblems(
  queryOrSearch?: string | QueryProblemsParams
): Promise<PaginatedProblemsResponse> {
  const params =
    typeof queryOrSearch === "string"
      ? { search: queryOrSearch }
      : queryOrSearch || {};

  const res = await apiClient.get<PaginatedProblemsResponse>("/problems", {
    params,
  });
  return res.data;
}

/**
 * Lấy chi tiết 1 đề bài kèm test cases
 */
export async function getProblemById(id: string): Promise<ProblemDetailResponse> {
  const res = await apiClient.get<ProblemDetailResponse>(`/problems/${id}`);
  return res.data;
}

/**
 * Tạo bài tập mới
 */
export async function createProblem(payload: CreateProblemPayload): Promise<ProblemItem> {
  const res = await apiClient.post<ProblemItem>("/problems", payload);
  return res.data;
}

/**
 * Cập nhật bài tập
 */
export async function updateProblem(id: string, payload: UpdateProblemPayload): Promise<ProblemItem> {
  const res = await apiClient.patch<ProblemItem>(`/problems/${id}`, payload);
  return res.data;
}

/**
 * Xóa bài tập
 */
export async function deleteProblem(id: string): Promise<any> {
  const res = await apiClient.delete(`/problems/${id}`);
  return res.data;
}

export interface GenerateBoundaryTestsPayload {
  problemTitle: string;
  problemDescription: string;
  solutionCode: string;
  language: string;
  numCases?: number;
}

export interface GeneratedBoundaryTestCase {
  name: string;
  category?: string;
  description?: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  score: number;
  judgeStatus?: string;
  executionTime?: string;
  memoryUsed?: number;
}

export interface GenerateBoundaryTestsResponse {
  success: boolean;
  astReport: {
    success: boolean;
    language: string;
    conditions: Array<{
      line: number;
      expression: string;
      variable: string;
      operator: string;
      constant: any;
      bva_candidates: any[];
      category: string;
    }>;
    special_constants: any[];
    summary: string;
  };
  testCases: GeneratedBoundaryTestCase[];
  summary: string;
}

/**
 * Tự động sinh ca kiểm thử biên (AST + AI + Judge0)
 */
export async function generateBoundaryTests(
  payload: GenerateBoundaryTestsPayload
): Promise<GenerateBoundaryTestsResponse> {
  const res = await apiClient.post<GenerateBoundaryTestsResponse>(
    "/problems/generate-boundary-tests",
    payload
  );
  return res.data;
}
