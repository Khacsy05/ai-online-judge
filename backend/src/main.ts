import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ✅ Bật cookie-parser để đọc request.cookies['refreshToken']
  app.use(cookieParser());
  // ✅ Bật CORS cho toàn bộ domain frontend
  app.setGlobalPrefix('api');

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
