import apiClient from "@/lib/apiClient";
import { ClassroomProgress } from "@/types";
import { ClassQueryDto } from "@/types/classroom";

export async function getClassList(query?: ClassQueryDto) {
  try {
    const response = await apiClient.get('/classrooms', {
      params: query
    });
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách lớp:', error);
    throw error;
  }
}

export async function getMyProgress(classroomId: string) {
  try {
    const response = await apiClient.get(`/classrooms/${classroomId}/my-progress`);
    return response.data;
  } catch (error) {
    console.error('Lỗi khi lấy tiến độ của tôi:', error);
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
    console.error('Lỗi khi lấy bảng xếp hạng lớp học:', error);
    throw error;
  }
}