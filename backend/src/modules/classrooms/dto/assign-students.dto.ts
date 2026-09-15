export class AssignStudentsDto {
  /**
   * Danh sách ID người dùng (User ID) hoặc Mã sinh viên (studentCode)
   * Có thể truyền:
   * - studentIds: ["uuid-1", "uuid-2"]
   * - hoặc studentCodes: ["SV001", "SV002"]
   * - hoặc truyền 1 sinh viên: studentId: "uuid-1"
   */
  studentIds?: string[];
  studentCodes?: string[];
  studentId?: string;
}
