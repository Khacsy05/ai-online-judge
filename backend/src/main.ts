import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ✅ Bật CORS cho toàn bộ domain frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true, // ✅ Quan trọng: cho phép gửi cookie
  });
  await app.listen(process.env.PORT ?? 3001);
  console.log(`Backend đang chạy tại: ${process.env.PORT}`);
}
bootstrap();
