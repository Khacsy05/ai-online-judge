import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface Judge0SubmissionResult {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  time: string | null; // Thời gian chạy tính bằng giây (ví dụ "0.015")
  memory: number | null; // Bộ nhớ sử dụng tính bằng KB
  status: {
    id: number;
    description: string;
  };
}

export interface TestCaseExecution {
  testCaseId: string;
  status: 'ACCEPTED' | 'WRONG_ANSWER' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR';
  actualOutput?: string;
  errorMessage?: string;
  executionTimeMs?: number;
  memoryUsedKb?: number;
}

@Injectable()
export class Judge0Service {
  private readonly logger = new Logger(Judge0Service.name);
  private readonly apiUrl: string;

  constructor() {
    this.apiUrl = process.env.JUDGE0_API_URL || 'http://localhost:2358';
  }

  /**
   * Ánh xạ định dạng ngôn ngữ sang Judge0 Language ID chuẩn
   */
  getLanguageId(language: string): number | null {
    const lang = language.toLowerCase().trim();
    switch (lang) {
      case 'cpp':
      case 'c++':
      case 'cc':
      case 'cxx':
        return 54; // C++ (GCC 9.2.0)
      case 'c':
        return 50; // C (GCC 9.2.0)
      case 'python':
      case 'py':
      case 'python3':
        return 71; // Python (3.8.1)
      case 'java':
        return 62; // Java (OpenJDK 13.0.1)
      case 'javascript':
      case 'js':
      case 'node':
        return 63; // JavaScript (Node.js 12.14.0)
      case 'typescript':
      case 'ts':
        return 74; // TypeScript (3.7.4)
      case 'go':
      case 'golang':
        return 60; // Go (1.13.5)
      default:
        return null;
    }
  }

  /**
   * Thực thi code trên Judge0 Sandbox với 1 testcase cụ thể
   */
  async executeSingleTestCase(
    sourceCode: string,
    languageId: number,
    input: string,
    expectedOutput?: string,
    timeLimitMs = 1000,
    memoryLimitMb = 256,
  ): Promise<Judge0SubmissionResult> {
    const cpuTimeLimitSec = Math.max(1, Math.ceil(timeLimitMs / 1000));
    const isJava = languageId === 62;
    // Cấp 512MB cho JVM sandbox để tránh lỗi 422 Unprocessable Entity
    const actualMemoryLimitMb = isJava ? Math.min(512, Math.max(256, memoryLimitMb)) : memoryLimitMb;
    const memoryLimitKb = actualMemoryLimitMb * 1024;

    const payload: Record<string, any> = {
      source_code: sourceCode,
      language_id: languageId,
      stdin: input,
      expected_output: expectedOutput,
      cpu_time_limit: Math.max(3, cpuTimeLimitSec), // Java cần ít nhất 3 giây để JVM khởi động
      memory_limit: memoryLimitKb,
      enable_per_process_and_thread_time_limit: true,
      enable_per_process_and_thread_memory_limit: true,
      ...(isJava && {
        compiler_options: '-J-Xms64m -J-Xmx128m',
        command_line_arguments: '-Xms64m -Xmx128m',
      }),
    };

    const response = await axios.post<Judge0SubmissionResult>(
      `${this.apiUrl}/submissions?base64_encoded=false&wait=true`,
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: (cpuTimeLimitSec + 5) * 1000,
      },
    );

    return response.data;
  }

  /**
   * Chuyển đổi mã trạng thái của Judge0 sang JudgeStatus của hệ thống
   * Judge0 Status IDs:
   * 1: In Queue, 2: Processing, 3: Accepted, 4: Wrong Answer, 5: Time Limit Exceeded,
   * 6: Compilation Error, 7..12: Runtime Error
   */
  mapJudge0Status(statusId: number): 'ACCEPTED' | 'WRONG_ANSWER' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR' {
    if (statusId === 3) {
      return 'ACCEPTED';
    }
    if (statusId === 4) {
      return 'WRONG_ANSWER';
    }
    if (statusId === 6) {
      return 'COMPILATION_ERROR';
    }
    // 5 (TLE), 7..12: Coi là Runtime Error hoặc Time Limit
    return 'RUNTIME_ERROR';
  }
}
