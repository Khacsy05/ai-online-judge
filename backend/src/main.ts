import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🛡️ Kích hoạt HTTP Security Headers bảo vệ ứng dụng
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // ✅ Bật cookie-parser để đọc request.cookies['refreshToken']
  app.use(cookieParser());
  // ✅ Bật CORS cho toàn bộ domain frontend
  app.setGlobalPrefix('api');

  // 🛡️ Bật ValidationPipe toàn cục: Tự động lọc sạch field thừa (chống Mass Assignment) & ép kiểu an toàn
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Chỉ cho phé các field có khai báo trong DTO đi qua
      transform: true, // Tự động convert kiểu dữ liệu phù hợp (string -> number, boolean)
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true, // ✅ Quan trọng: cho phép gửi cookie
  });
  const port = process.env.PORT ?? 3001;
  await app.listen(port, "0.0.0.0");
  console.log(`Backend đang chạy tại: http://localhost:${port}`);
}
bootstrap();
