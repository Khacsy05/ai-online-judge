import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth API (Integration Test)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // 1. Lắp ráp toàn bộ Module của NestJS (giống hệt khi server thật chạy)
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // 2. Kích hoạt tiền tố '/api' và bộ lọc ValidationPipe như trong main.ts
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    // Đóng server sau khi kiểm thử xong
    await app.close();
  });

  // =========================================================================
  // CA TEST 1: Kiểm thử tính năng Validation DTO (Dữ liệu gửi lên bị thiếu)
  // =========================================================================
  it('POST /api/auth/login - Phải chặn lỗi 400 Bad Request nếu gửi body rỗng', async () => {
    // Bắn request POST giả lập vào endpoint /api/auth/login với body rỗng {}
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({}); // Không truyền email hay password

    // Kỳ vọng: Hệ thống phải trả về mã HTTP 400 Bad Request
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    // Kiểm tra thông báo lỗi có nhắc nhở về email và mật khẩu không
    expect(JSON.stringify(response.body.message)).toContain('không được để trống');
  });

  it('POST /api/auth/login - Phải chặn lỗi 400 nếu mật khẩu quá ngắn (< 6 ký tự)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'user@example.com',
        password: '123', // Mật khẩu chỉ có 3 ký tự
      });

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body.message)).toContain('Mật khẩu phải từ 6 ký tự trở lên');
  });

  // =========================================================================
  // CA TEST 2: Kiểm thử logic xác thực sai tài khoản
  // =========================================================================
  it('POST /api/auth/login - Phải trả về 401 Unauthorized nếu đăng nhập sai tài khoản', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'tai_khoan_chac_chan_khong_ton_tai_9999@test.com',
        password: 'wrongpassword123',
      });

    // Kỳ vọng: Hệ thống từ chối đăng nhập với mã 401 hoặc 404
    expect([401, 404]).toContain(response.status);
  });

  // =========================================================================
  // CA TEST 3: Kiểm thử API Đăng xuất (Logout)
  // =========================================================================
  it('POST /api/auth/logout - Phải đăng xuất thành công và trả về 201/200', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send();

    expect([200, 201]).toContain(response.status);
    expect(response.body).toEqual({ message: 'Đăng xuất thành công' });
  });
});
