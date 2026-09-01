export type Assignment = {
  id: number | string;
  title: string;
  code: string;
  due: string;
  difficulty: "Dễ" | "Trung bình" | "Khó";
  status: "Chưa nộp" | "Đã nộp" | "Đang chấm";
  score?: number;
  description: string;
  requirements: string[];
  tests: { input: string; output: string }[];
};
