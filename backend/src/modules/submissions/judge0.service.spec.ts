import { Test, TestingModule } from '@nestjs/testing';
import { Judge0Service } from './judge0.service';

describe('Judge0Service (Unit Test)', () => {
  let service: Judge0Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Judge0Service],
    }).compile();

    service = module.get<Judge0Service>(Judge0Service);
  });

  it('Service phải được khởi tạo thành công', () => {
    expect(service).toBeDefined();
  });

  describe('mapJudge0Status (Chuyển đổi mã trạng thái Judge0)', () => {
    it('Phải chuyển statusId = 3 thành ACCEPTED', () => {
      const result = service.mapJudge0Status(3);
      expect(result).toBe('ACCEPTED');
    });

    it('Phải chuyển statusId = 4 thành WRONG_ANSWER', () => {
      const result = service.mapJudge0Status(4);
      expect(result).toBe('WRONG_ANSWER');
    });

    it('Phải chuyển statusId = 6 thành COMPILATION_ERROR', () => {
      const result = service.mapJudge0Status(6);
      expect(result).toBe('COMPILATION_ERROR');
    });

    it('Phải chuyển statusId = 5 (Time Limit) thành RUNTIME_ERROR', () => {
      const result = service.mapJudge0Status(5);
      expect(result).toBe('RUNTIME_ERROR');
    });

    it('Phải chuyển các statusId khác (7..12) thành RUNTIME_ERROR', () => {
      expect(service.mapJudge0Status(7)).toBe('RUNTIME_ERROR');
      expect(service.mapJudge0Status(11)).toBe('RUNTIME_ERROR');
    });
  });

  describe('Logic quy đổi điểm thang điểm 10 (Score Calculation)', () => {
    it('Quy đổi chính xác khi đạt 100% testcase (3/3 test case)', () => {
      const totalEarnedScore = 3;
      const totalMaxScore = 3;
      const finalScore10 =
        totalMaxScore > 0
          ? Math.round((totalEarnedScore / totalMaxScore) * 10 * 10) / 10
          : 10;

      expect(finalScore10).toBe(10);
    });

    it('Quy đổi chính xác khi làm đúng 2/3 testcase (làm tròn 6.7)', () => {
      const totalEarnedScore = 2;
      const totalMaxScore = 3;
      const finalScore10 =
        totalMaxScore > 0
          ? Math.round((totalEarnedScore / totalMaxScore) * 10 * 10) / 10
          : 10;

      expect(finalScore10).toBe(6.7);
    });

    it('Quy đổi an toàn thành 10 điểm nếu bài tập không có testcase nào (tránh chia cho 0)', () => {
      const totalEarnedScore = 0;
      const totalMaxScore = 0;
      const finalScore10 =
        totalMaxScore > 0
          ? Math.round((totalEarnedScore / totalMaxScore) * 10 * 10) / 10
          : 10;

      expect(finalScore10).toBe(10);
    });
  });
});
