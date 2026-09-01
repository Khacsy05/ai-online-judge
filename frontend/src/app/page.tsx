"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Search,
  Send,
} from "lucide-react";
import { Assignment } from "@/types";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { DetailModal } from "@/components/detail-modal";
import { SubmitModal } from "@/components/submit-modal";

const assignments: Assignment[] = [
  {
    id: 1,
    title: "Tìm cặp số có tổng bằng K",
    code: "Bài tập 01",
    due: "18 tháng 9, 2026",
    difficulty: "Dễ",
    status: "Đã nộp",
    description:
      "Cho một mảng số nguyên và số K. Hãy tìm hai vị trí khác nhau sao cho tổng hai phần tử bằng K.",
    requirements: [
      "Mỗi test chỉ có duy nhất một đáp án.",
      "Độ phức tạp kỳ vọng: O(n).",
      "Trả về chỉ số theo thứ tự tăng dần.",
    ],
    tests: [
      { input: "nums = [2, 7, 11, 15], K = 9", output: "[0, 1]" },
      { input: "nums = [3, 2, 4], K = 6", output: "[1, 2]" },
    ],
  },
  {
    id: 2,
    title: "Quản lý danh sách liên kết",
    code: "Bài tập 02",
    due: "22 tháng 9, 2026",
    difficulty: "Trung bình",
    status: "Đang chấm",
    description:
      "Cài đặt các thao tác cơ bản trên danh sách liên kết đơn: thêm, xóa và đảo ngược danh sách.",
    requirements: [
      "Sử dụng cấu trúc Node được cung cấp.",
      "Không dùng thư viện ngoài.",
      "Xử lý đúng danh sách rỗng.",
    ],
    tests: [
      { input: "1 -> 2 -> 3 -> NULL", output: "3 -> 2 -> 1 -> NULL" },
      { input: "NULL", output: "NULL" },
    ],
  },
  {
    id: 3,
    title: "Đường đi ngắn nhất trên đồ thị",
    code: "Bài tập 03",
    due: "29 tháng 9, 2026",
    difficulty: "Khó",
    status: "Chưa nộp",
    description:
      "Tìm đường đi ngắn nhất từ đỉnh nguồn đến tất cả các đỉnh còn lại trong một đồ thị có trọng số không âm.",
    requirements: [
      "Đồ thị có tối đa 10.000 đỉnh.",
      "Trọng số cạnh không âm.",
      "In -1 nếu không thể đi tới đỉnh.",
    ],
    tests: [
      { input: "A-B:4, A-C:1, C-B:2", output: "A -> C -> B (3)" },
      { input: "A -> B:7", output: "A: 0, B: 7" },
    ],
  },
  {
    id: 4,
    title: "Bộ đếm tần suất từ",
    code: "Bài tập 04",
    due: "05 tháng 10, 2026",
    difficulty: "Trung bình",
    status: "Chưa nộp",
    description:
      "Đếm số lần xuất hiện của từng từ trong một đoạn văn và sắp xếp kết quả theo tần suất giảm dần.",
    requirements: [
      "Không phân biệt chữ hoa và chữ thường.",
      "Bỏ qua dấu câu.",
      "Các từ cùng tần suất sắp xếp alphabet.",
    ],
    tests: [{ input: "Hello world, hello!", output: "hello: 2, world: 1" }],
  },
];

const statusStyles = {
  "Đã nộp": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "Đang chấm": "bg-amber-50 text-amber-700 ring-amber-200",
  "Chưa nộp": "bg-slate-100 text-slate-600 ring-slate-200",
};

export default function StudentDashboard() {
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [submitFor, setSubmitFor] = useState<Assignment | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      assignments.filter((a) =>
        a.title.toLowerCase().includes(query.toLowerCase())
      ),
    [query]
  );
  const completed = assignments.filter((a) => a.status === "Đã nộp").length;

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-900">
      {/* Sidebar dùng chung */}
      <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Main Container */}
      <main className="lg:pl-64">
        {/* Header dùng chung */}
        <Header onOpenMenu={() => setMenuOpen(true)} />

        {/* Nội dung trang */}
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
          <div className="mb-8">
            <p className="mb-2 text-sm font-medium text-blue-600">
              Thứ hai, 14 tháng 9, 2026
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Xin chào, Nguyễn An
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Đây là những bài tập được giao cho bạn trong lớp học này.
            </p>
          </div>

          {/* 3 Thẻ thống kê */}
          <section className="mb-9 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-500">Tổng bài tập</p>
                <FileText className="text-blue-500" size={19} />
              </div>
              <p className="text-2xl font-semibold">{assignments.length}</p>
              <p className="mt-1 text-xs text-slate-400">được giao trong lớp</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-500">Đã hoàn thành</p>
                <CheckCircle2 className="text-emerald-500" size={19} />
              </div>
              <p className="text-2xl font-semibold">
                {completed}{" "}
                <span className="text-sm font-normal text-slate-400">
                  / {assignments.length}
                </span>
              </p>
              <div className="mt-3 h-1.5 rounded-full bg-slate-100">
                <div
                  className="h-1.5 rounded-full bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${(completed / assignments.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-500">Hạn gần nhất</p>
                <Clock3 className="text-amber-500" size={19} />
              </div>
              <p className="text-lg font-semibold">18 tháng 9</p>
              <p className="mt-1 text-xs text-slate-400 truncate">
                Tìm cặp số có tổng bằng K
              </p>
            </div>
          </section>

          {/* Danh sách bài tập */}
          <section
            id="assignments"
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Bài tập được giao
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Chỉ hiển thị bài tập của lớp Lập trình nâng cao
                </p>
              </div>

              <label className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-400">
                <Search size={16} />
                <span className="sr-only">Tìm bài tập</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm bài tập..."
                  className="w-36 bg-transparent outline-none placeholder:text-slate-400 text-slate-900"
                />
              </label>
            </div>

            <div className="divide-y divide-slate-100">
              {filtered.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col gap-4 p-5 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {a.code}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                          a.difficulty === "Khó"
                            ? "bg-rose-50 text-rose-600 ring-rose-200"
                            : a.difficulty === "Dễ"
                            ? "bg-sky-50 text-sky-600 ring-sky-200"
                            : "bg-violet-50 text-violet-600 ring-violet-200"
                        }`}
                      >
                        {a.difficulty}
                      </span>
                    </div>
                    <h3 className="truncate font-medium text-slate-800">
                      {a.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Hạn nộp: {a.due}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                        statusStyles[a.status]
                      }`}
                    >
                      {a.status}
                    </span>
                    <button
                      onClick={() => setSelected(a)}
                      className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Xem chi tiết <ChevronRight size={15} />
                    </button>
                    <button
                      onClick={() => setSubmitFor(a)}
                      className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-sm shadow-blue-200 hover:bg-blue-700 cursor-pointer"
                    >
                      <Send size={14} /> Nộp bài
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Modals */}
      {selected && (
        <DetailModal
          assignment={selected}
          onClose={() => setSelected(null)}
          onSubmit={() => {
            const current = selected;
            setSelected(null);
            setSubmitFor(current);
          }}
        />
      )}

      {submitFor && (
        <SubmitModal
          assignment={submitFor}
          onClose={() => setSubmitFor(null)}
        />
      )}
    </div>
  );
}
