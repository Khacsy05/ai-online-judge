import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
  await app.listen(port);
  console.log(`Backend đang chạy tại: http://localhost:${port}`);
}
bootstrap();
