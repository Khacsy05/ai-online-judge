import apiClient from "@/lib/apiClient";
import {
  Submission,
  SubmissionListItem,
  SubmissionDetailResponse,
  SubmissionQuery,
  PaginatedSubmissionsResponse,
} from "@/types/submission";

/**
 * Nộp bài tập dạng file mã nguồn (.cpp, .py, .java, .js, .ts, .go)
 * @param file File bài làm của sinh viên
 * @param assignmentId ID của bài tập được giao
 */
export async function submitCode(
  file: File,
  assignmentId: string
): Promise<Submission> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("assignmentId", assignmentId);

  const response = await apiClient.post<Submission>("/submissions", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

/**
 * Lấy danh sách các bài đã nộp kèm phân trang, tìm kiếm và lọc từ backend
 * @param query Tham số lọc (userId, assignmentId, search, status, language, page, limit)
 */
export async function getSubmissions(
  query?: SubmissionQuery
): Promise<PaginatedSubmissionsResponse> {
  const response = await apiClient.get<PaginatedSubmissionsResponse>("/submissions", {
    params: query,
  });
  return response.data;
}

/**
 * Lấy thông tin chi tiết một bài nộp theo ID (kèm chi tiết từng test case)
 * @param id ID của bài nộp
 */
export async function getSubmissionById(
  id: string
): Promise<SubmissionDetailResponse> {
  const response = await apiClient.get<SubmissionDetailResponse>(
    `/submissions/${id}`
  );
  return response.data;
}

export const submissionService = {
  submitCode,
  getSubmissions,
  getSubmissionById,
};

export default submissionService;