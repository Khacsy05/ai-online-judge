<div align="center">

# ⚡ AI-Powered Online Judge Platform
### Nền tảng Đánh giá & Chấm điểm Mã nguồn Tự động bằng AI & Docker Sandbox

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)

<p align="center">
  <a href="#-tính-năng-nổi-bật">Tính năng</a> •
  <a href="#-kiến-trúc-hệ-thống">Kiến trúc</a> •
  <a href="#-công-nghệ-sử-dụng">Tech Stack</a> •
  <a href="#-cài-đặt--khởi-chạy">Cài đặt</a> •
  <a href="#-cấu-trúc-thư-mục">Thư mục</a>
</p>

</div>

---

## 📌 Giới Thiệu Dự Án

**AI-Powered Online Judge** là hệ thống giải bài tập lập trình trực tuyến toàn diện, tích hợp môi trường thực thi mã nguồn an toàn (Docker Sandbox) cùng trợ lý AI đánh giá thuật toán. Hệ thống giải quyết triệt để bài toán an toàn hệ thống khi chạy mã tùy ý của người dùng, đồng thời mang lại phản hồi sư phạm tức thì thay vì chỉ thông báo Đúng/Sai thông thường.

---

## ✨ Tính Năng Nổi Bật

* 🛡️ **Môi trường Sandbox Cô lập Tuyệt đối:** Chạy code trong Docker container với cờ giới hạn (`--network=none`, `--memory=128m`, `--cpus=0.5`, `read_only: true`), ngăn chặn 100% tấn công DoS, fork bomb hay truy cập file hệ thống.
* 🤖 **AI Code Mentor & Reviewer:** Tích hợp LLM phân tích mã nguồn theo chuẩn **Strict JSON Mode**:
  * Đánh giá độ phức tạp thời gian & không gian ($O(N)$, $O(\log N)$).
  * Chấm điểm Clean Code, phát hiện biến thừa và lỗ hổng tiềm ẩn.
  * Đưa ra gợi ý cải tiến thuật toán mà không làm lộ đáp án hoàn chỉnh.
* ⚡ **Xử lý Bất đồng bộ & Realtime Stream:** Sử dụng **BullMQ + Redis** phân luồng hàng đợi chấm bài; cập nhật trạng thái chấm từng Test Case về client qua **WebSockets (Socket.io)** với độ trễ tính bằng mili-giây.
* 💻 **Interactive Code Workspace:** Nhúng trình soạn thảo **Monaco Editor** (chuẩn VS Code), hỗ trợ phím tắt, đổi theme sáng/tối, chạy thử Custom Test Cases linh hoạt.
* 👥 **Phân Quyền Đa Tầng (RBAC):** Quản lý vai trò Sinh viên (nộp bài, xem lịch sử, bảng xếp hạng) và Giảng viên (tạo đề bài, quản lý test case ẩn).

---

## 🏗️ Kiến Trúc Hệ Thống

```mermaid
flowchart TD
    subgraph Client["Frontend (Next.js App Router)"]
        UI[Monaco Editor / Workspace]
    end

    subgraph Gateway["Backend (NestJS API Gateway)"]
        API[Auth & Submission Controller]
        WS[WebSocket Gateway]
    end

    subgraph QueueSystem["Asynchronous Queue"]
        Queue[(BullMQ / Redis)]
    end

    subgraph Workers["Grading Workers"]
        Runner[Docker Sandbox Engine]
        AIEngine[AI Evaluator Worker]
    end

    subgraph Storage["Persistence Layer"]
        DB[(PostgreSQL via Prisma)]
    end

    UI -->|1. Submit Code| API
    API -->|2. Push Job| Queue
    Queue -->|3. Dispatch| Runner
    Queue -->|3. Dispatch| AIEngine
    Runner -->|4. Test Output| DB
    AIEngine -->|4. AI Metrics| DB
    DB -.->|5. Realtime Status| WS
    WS -.->|6. Push Result| UI