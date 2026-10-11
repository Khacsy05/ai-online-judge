/**
 * File: classroom-analytics.spec.ts
 * Kiểm thử đơn vị (Unit Test) cho logic tính toán Thống kê lớp học & Bảng điểm
 */

describe('Classroom Analytics & Gradebook (Unit Test)', () => {
  // Hàm tính tỷ lệ đậu / rớt của 1 bài tập (giống hệt logic trong classrooms.service.ts)
  function calculatePassFailRates(attemptedCount: number, passedCount: number) {
    if (attemptedCount <= 0) {
      return { passRate: 0, failRate: 0 };
    }
    const passRate = Math.round((passedCount / attemptedCount) * 1000) / 10;
    const failRate = Math.round((100 - passRate) * 10) / 10;
    return { passRate, failRate };
  }

  // Hàm tính tiến độ hoàn thành lớp học (%) của 1 sinh viên
  function calculateStudentProgress(totalScore: number, totalAssignments: number) {
    const maxPossibleScore = totalAssignments * 10;
    if (maxPossibleScore <= 0) return 0;
    return Math.round((totalScore / maxPossibleScore) * 1000) / 10;
  }

  // Hàm tìm bài tập có tỷ lệ SAI cao nhất (để giáo viên biết bài nào khó nhất)
  function findMostDifficultAssignment(
    assignments: Array<{ title: string; failRate: number; attempted: number }>
  ) {
    return assignments
      .filter((a) => a.attempted > 0)
      .sort((a, b) => b.failRate - a.failRate)[0] || null;
  }

  // =========================================================================
  // BỘ TEST 1: Kiểm tra tính Tỷ lệ Pass / Fail
  // =========================================================================
  describe('calculatePassFailRates', () => {
    it('Trường hợp cả lớp 10 bạn làm đều đậu (10/10) -> Pass 100%, Fail 0%', () => {
      const result = calculatePassFailRates(10, 10);
      expect(result.passRate).toBe(100);
      expect(result.failRate).toBe(0);
    });

    it('Trường hợp 3 bạn nộp bài, 1 bạn đậu (1/3) -> Pass 33.3%, Fail 66.7%', () => {
      const result = calculatePassFailRates(3, 1);
      expect(result.passRate).toBe(33.3);
      expect(result.failRate).toBe(66.7);
    });

    it('Trường hợp chưa ai nộp bài (0 bạn) -> Không bị lỗi chia cho 0, trả về 0%', () => {
      const result = calculatePassFailRates(0, 0);
      expect(result.passRate).toBe(0);
      expect(result.failRate).toBe(0);
    });
  });

  // =========================================================================
  // BỘ TEST 2: Kiểm tra tính % Tiến độ của Sinh viên (Gradebook Progress)
  // =========================================================================
  describe('calculateStudentProgress', () => {
    it('Lớp có 4 bài tập (tối đa 40đ), sinh viên đạt 25đ -> Tiến độ 62.5%', () => {
      const progress = calculateStudentProgress(25, 4);
      expect(progress).toBe(62.5);
    });

    it('Sinh viên làm trọn vẹn điểm (40/40đ) -> Tiến độ 100%', () => {
      const progress = calculateStudentProgress(40, 4);
      expect(progress).toBe(100);
    });

    it('Lớp học chưa giao bài tập nào (0 bài) -> Trả về 0%, không bị NaN', () => {
      const progress = calculateStudentProgress(0, 0);
      expect(progress).toBe(0);
    });
  });

  // =========================================================================
  // BỘ TEST 3: Thuật toán tìm bài tập sinh viên sai nhiều nhất (Bài khó nhất)
  // =========================================================================
  describe('findMostDifficultAssignment', () => {
    it('Phải chọn đúng bài tập có tỷ lệ Fail cao nhất trong các bài đã có người làm', () => {
      const sampleAssignments = [
        { title: 'Bài 1: A + B', failRate: 10.0, attempted: 20 },
        { title: 'Bài 2: Dãy Fibonacci', failRate: 45.5, attempted: 15 },
        { title: 'Bài 3: Quy hoạch động Cái Túi', failRate: 85.0, attempted: 12 },
        { title: 'Bài 4: Đồ thị nâng cao', failRate: 100.0, attempted: 0 }, // Chưa ai làm
      ];

      const hardest = findMostDifficultAssignment(sampleAssignments);

      // Bài 4 failRate 100% nhưng chưa ai làm (attempted = 0) nên phải bỏ qua
      // Bài khó nhất thực tế phải là Bài 3 với tỷ lệ fail 85%
      expect(hardest).not.toBeNull();
      expect(hardest?.title).toBe('Bài 3: Quy hoạch động Cái Túi');
      expect(hardest?.failRate).toBe(85.0);
    });
  });
});
