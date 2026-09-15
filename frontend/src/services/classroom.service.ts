import apiClient from "@/lib/apiClient";
import { ClassroomProgress } from "@/types";
import { ClassQueryDto } from "@/types/classroom";

export interface ClassroomItem {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  _count?: {
    members: number;
    assignments: number;
  };
}

export interface ClassroomDetailResponse extends ClassroomItem {
  members: Array<{
    id: string;
    userId: string;
    classroomId: string;
    joinedAt: string;
    user: {
      id: string;
      fullName: string;
      studentCode: string | null;
      email: string;
      role: string;
    };
  }>;
  assignments: Array<{
    id: string;
    problemId: string;
    classroomId: string;
    startTime: string;
    deadline: string;
    problem: {
      id: string;
      title: string;
      timeLimitMs?: number;
      memoryLimitMb?: number;
    };
  }>;
}

export interface CreateClassroomPayload {
  code: string;
  name: string;
}

export interface UpdateClassroomPayload {
  code?: string;
  name?: string;
}

export interface AssignStudentsPayload {
  studentCodes?: string[];
  studentIds?: string[];
  studentId?: string;
}

export interface AvailableStudentItem {
  id: string;
  fullName: string;
  studentCode: string | null;
  email: string;
}

/**
 * Lấy danh sách các sinh viên CHƯA tham gia vào lớp học này
 */
export async function getAvailableStudents(
  classroomId: string,
  search?: string
): Promise<AvailableStudentItem[]> {
  const res = await apiClient.get<AvailableStudentItem[]>(
    `/classrooms/${classroomId}/available-students`,
    { params: { search } }
  );
  return res.data;
}

/**
 * Lấy danh sách toàn bộ lớp học kèm sĩ số và bài tập
 */
export async function getClassList(query?: ClassQueryDto): Promise<ClassroomItem[]> {
  try {
    const response = await apiClient.get<ClassroomItem[]>("/classrooms", {
      params: query,
    });
    return response.data;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách lớp:", error);
    throw error;
  }
}

/**
 * Lấy chi tiết một lớp học
 */
export async function getClassroomById(id: string): Promise<ClassroomDetailResponse> {
  const res = await apiClient.get<ClassroomDetailResponse>(`/classrooms/${id}`);
  return res.data;
}

/**
 * Tạo lớp học mới
 */
export async function createClassroom(data: CreateClassroomPayload): Promise<ClassroomItem> {
  const res = await apiClient.post<ClassroomItem>("/classrooms", data);
  return res.data;
}

/**
 * Cập nhật lớp học
 */
export async function updateClassroom(id: string, data: UpdateClassroomPayload): Promise<ClassroomItem> {
  const res = await apiClient.patch<ClassroomItem>(`/classrooms/${id}`, data);
  return res.data;
}

/**
 * Xóa lớp học (chỉ cho phép nếu lớp chưa có sinh viên)
 */
export async function deleteClassroom(id: string): Promise<{ message: string }> {
  const res = await apiClient.delete<{ message: string }>(`/classrooms/${id}`);
  return res.data;
}

/**
 * Phân công sinh viên vào lớp
 */
export async function assignStudentsToClass(
  classroomId: string,
  payload: AssignStudentsPayload
): Promise<{ message: string; addedCount: number; alreadyExistedCount?: number }> {
  const res = await apiClient.post(`/classrooms/${classroomId}/assign-students`, payload);
  return res.data;
}

/**
 * Xóa sinh viên khỏi lớp học (1 sinh viên)
 */
export async function removeStudentFromClass(
  classroomId: string,
  userId: string
): Promise<{ message: string }> {
  const res = await apiClient.delete(`/classrooms/${classroomId}/students/${userId}`);
  return res.data;
}

/**
 * Xóa nhiều sinh viên khỏi lớp học cùng lúc
 */
export async function removeStudentsFromClass(
  classroomId: string,
  userIds: string[]
): Promise<{ message: string; deletedCount: number }> {
  const res = await apiClient.delete(`/classrooms/${classroomId}/students`, {
    data: { userIds },
  });
  return res.data;
}

export interface AssignProblemPayload {
  classroomId: string;
  problemId: string;
  startTime?: string;
  deadline?: string;
}

/**
 * Giao bài tập cho lớp học
 */
export async function assignProblemToClass(
  payload: AssignProblemPayload
): Promise<any> {
  const res = await apiClient.post("/assignments", payload);
  return res.data;
}

/**
 * Xóa bài tập khỏi lớp học
 */
export async function removeAssignmentFromClass(
  assignmentId: string
): Promise<any> {
  const res = await apiClient.delete(`/assignments/${assignmentId}`);
  return res.data;
}

export async function getMyProgress(classroomId: string) {
  try {
    const response = await apiClient.get(`/classrooms/${classroomId}/my-progress`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status !== 403) {
      console.error("Lỗi khi lấy tiến độ của tôi:", error);
    }
    throw error;
  }
}

export async function getClassroomLeaderboard(classroomId: string, query?: ClassQueryDto) {
  try {
    const response = await apiClient.get(`/classrooms/${classroomId}/leaderboard`, {
      params: query,
    });
    return response.data;
  } catch (error) {
    console.error("Lỗi khi lấy bảng xếp hạng lớp học:", error);
    throw error;
  }
}