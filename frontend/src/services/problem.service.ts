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
