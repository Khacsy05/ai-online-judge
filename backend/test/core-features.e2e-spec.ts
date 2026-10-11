import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Core Features API (Integration Test)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Khởi tạo toàn bộ hệ thống NestJS
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================================
  // CA 1: Kiểm thử API Quản lý Bài tập (Problems)
  // =========================================================================
  describe('GET /api/problems', () => {
    it('Phải lấy được danh sách bài tập kèm phân trang (HTTP 200 OK)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/problems')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      if (response.body.items) {
        expect(Array.isArray(response.body.items)).toBe(true);
      } else {
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('Tìm kiếm bài tập với từ khóa tìm kiếm (Search Query)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/problems')
        .query({ search: 'Fibonacci' });

      expect(response.status).toBe(200);
    });

    it('Truy vấn bài tập không tồn tại -> Trả về lỗi 404 Not Found', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/problems/id-khong-the-ton-tai-9999');

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Không tìm thấy bài tập');
    });
  });

  // =========================================================================
  // CA 2: Kiểm thử API Lớp học & Bảo mật phân quyền (Classrooms Security)
  // =========================================================================
  describe('GET /api/classrooms/:id/analytics & security', () => {
    it('Lấy danh sách lớp học công khai (HTTP 200 OK)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/classrooms');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('Truy cập Dashboard Báo cáo lớp học mà không có JWT Token -> Bị chặn 401 Unauthorized', async () => {
      // Endpoint /api/classrooms/:id/analytics có gán @UseGuards(JwtAuthGuard)
      const response = await request(app.getHttpServer())
        .get('/api/classrooms/random-id/analytics');

      // Bắt buộc hệ thống phải bảo mật chặn người lạ
      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Token không hợp lệ hoặc đã hết hạn');
    });

    it('Gọi API Quét đạo văn mà không có JWT Token -> Bị chặn 401 Unauthorized', async () => {
      // Endpoint plagiarism-check có bảo vệ bởi JwtAuthGuard
      const response = await request(app.getHttpServer())
        .post('/api/classrooms/class-1/assignments/assign-1/plagiarism-check');

      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // CA 3: Kiểm thử API Tạo bài tập tự động bằng AI (Boundary Tests Generator)
  // =========================================================================
  describe('POST /api/problems/generate-boundary-tests', () => {
    it('Gửi mã nguồn bài toán mẫu -> DTO Validation hoạt động và sinh testcase (HTTP 200/201)', async () => {
      const samplePythonCode = `
def solve(n):
    if n <= 0:
        return 0
    if n > 100:
        return 100
    return n * 2
`;
      const response = await request(app.getHttpServer())
        .post('/api/problems/generate-boundary-tests')
        .send({
          problemTitle: 'Bài toán kiểm tra biên',
          problemDescription: 'Cho số n, tính kết quả',
          solutionCode: samplePythonCode,
          language: 'python',
        });

      // API phải xử lý và trả về test case hoặc phản hồi thành công
      expect([200, 201]).toContain(response.status);
      expect(response.body).toBeDefined();
    }, 20000);
  });
});
