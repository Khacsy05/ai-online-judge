import apiClient from "@/lib/apiClient";

export interface AdminStatsResponse {
  totalClassrooms: number;
  totalProblems: number;
  totalStudents: number;
  totalAdmins: number;
  totalSubmissions: number;
  acceptedSubmissions: number;
  acceptanceRate: number;
}

/**
 * Lấy các chỉ số thống kê vĩ mô cho Admin Dashboard (/admin/stats)
 */
export async function getAdminStats(): Promise<AdminStatsResponse> {
  const res = await apiClient.get<AdminStatsResponse>("/admin/stats");
  return res.data;
}
