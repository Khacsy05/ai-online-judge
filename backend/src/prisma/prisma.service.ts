import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb'; // 🌟 Dùng adapter mariadb chuẩn
import 'dotenv/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            throw new Error("DATABASE_URL is not defined in environment variables");
        }

        // Phân tách chuỗi DATABASE_URL để lấy thông tin kết nối cho Driver
        const url = new URL(dbUrl);

        // Nếu kết nối qua cloud (khác localhost/127.0.0.1) thì bắt buộc bật SSL
        const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
        const ssl = isLocal ? undefined : { rejectUnauthorized: true };

        const adapter = new PrismaMariaDb({
            host: url.hostname || 'localhost',
            port: url.port ? parseInt(url.port) : 3306,
            user: decodeURIComponent(url.username) || 'root',
            password: decodeURIComponent(url.password) || undefined,
            database: decodeURIComponent(url.pathname.substring(1)),
            ssl,
            connectTimeout: 10000, // Increase connection timeout to 10 seconds (default is 1s)
            acquireTimeout: 15000, // Increase acquire connection pool timeout to 15 seconds
        });

        // Khởi tạo PrismaClient bằng adapter
        super({ adapter });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}