import apiClient from "@/lib/apiClient";

export interface UserClassroomItem {
  id: string;
  userId: string;
  classroomId: string;
  joinedAt: string;
  classroom: {
    id: string;
    code: string;
    name: string;
  };
}

export interface UserItem {
  id: string;
  email: string;
  fullName: string;
  studentCode: string | null;
  role: "STUDENT" | "ADMIN";
  createdAt: string;
  classrooms?: UserClassroomItem[];
  _count?: {
    submissions: number;
    createdProblems?: number;
  };
}

export interface QueryUsersParams {
  search?: string;
  role?: "STUDENT" | "ADMIN";
  classroomId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedUsersResponse {
  items: UserItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  fullName: string;
  studentCode?: string;
  role?: "STUDENT" | "ADMIN";
  classroomId?: string;
}

export interface UpdateUserPayload {
  email?: string;
  fullName?: string;
  studentCode?: string;
  role?: "STUDENT" | "ADMIN";
  classroomId?: string;
}

/**
 * Lấy danh sách tài khoản người dùng kèm phân trang & bộ lọc
 */
export async function getUsers(
  query?: QueryUsersParams
): Promise<PaginatedUsersResponse> {
  const res = await apiClient.get<PaginatedUsersResponse>("/users", {
    params: query,
  });
  return res.data;
}

/**
 * Lấy chi tiết 1 người dùng theo ID
 */
export async function getUserById(id: string): Promise<UserItem> {
  const res = await apiClient.get<UserItem>(`/users/${id}`);
  return res.data;
}

/**
 * Tạo tài khoản người dùng mới
 */
export async function createUser(
  payload: CreateUserPayload
): Promise<{ message: string; data: UserItem }> {
  const res = await apiClient.post<{ message: string; data: UserItem }>("/users", payload);
  return res.data;
}

/**
 * Cập nhật thông tin tài khoản người dùng
 */
export async function updateUser(
  id: string,
  payload: UpdateUserPayload
): Promise<{ message: string; data: UserItem }> {
  const res = await apiClient.patch<{ message: string; data: UserItem }>(`/users/${id}`, payload);
  return res.data;
}

/**
 * Xóa tài khoản người dùng
 */
export async function deleteUser(
  id: string
): Promise<{ message: string }> {
  const res = await apiClient.delete<{ message: string }>(`/users/${id}`);
  return res.data;
}
