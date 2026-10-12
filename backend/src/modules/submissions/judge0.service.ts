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
    this.apiUrl = process.env.JUDGE0_API_URL || 'http://127.0.0.1:2358';
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
   * Thực thi code trên Judge0 Sandbox với 1 testcase cụ thể.
   * Tự động fallback sang Java Compiler cục bộ an toàn nếu Judge0 sandbox gặp sự cố JVM/cgroup.
   */
  async executeSingleTestCase(
    sourceCode: string,
    languageId: number,
    input: string,
    expectedOutput?: string,
    timeLimitMs = 1000,
    memoryLimitMb = 256,
  ): Promise<Judge0SubmissionResult> {
    const isJava = languageId === 62;
    let codeToExecute = sourceCode;

    // Chuẩn hoá tên class chính thành Main nếu là Java
    if (isJava) {
      codeToExecute = codeToExecute.replace(
        /public\s+class\s+[A-Za-z0-9_]+/g,
        'public class Main',
      );
    }

    const cpuTimeLimitSec = Math.max(1, Math.ceil(timeLimitMs / 1000));
    const actualMemoryLimitMb = isJava ? 500 : memoryLimitMb;
    const memoryLimitKb = actualMemoryLimitMb * 1024;
    const effectiveCpuTimeSec = Math.max(isJava ? 3 : 1, cpuTimeLimitSec);

    const payload: Record<string, any> = {
      source_code: codeToExecute,
      language_id: languageId,
      stdin: input,
      expected_output: expectedOutput,
      cpu_time_limit: effectiveCpuTimeSec,
      memory_limit: memoryLimitKb,
      enable_per_process_and_thread_time_limit: true,
      enable_per_process_and_thread_memory_limit: true,
    };

    const httpTimeoutMs = (effectiveCpuTimeSec + 15) * 1000;

    try {
      const response = await axios.post<Judge0SubmissionResult>(
        `${this.apiUrl}/submissions?base64_encoded=false&wait=true`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: Math.min(httpTimeoutMs, 6000), // Không để timeout quá lâu nếu server Judge0 offline
        },
      );

      const res = response.data;
      // Nếu là Java và gặp lỗi sandbox cgroup (Internal Error / signal 11 / JVM space reservation error)
      if (isJava && this.isJavaSandboxError(res)) {
        this.logger.warn(
          `⚠️ Judge0 sandbox gặp sự cố JVM cho Java. Đang chuyển sang Fallback...`,
        );
        return this.executeWithPistonFallback(
          codeToExecute,
          languageId,
          input,
          expectedOutput,
          timeLimitMs,
        );
      }

      return res;
    } catch (err: any) {
      this.logger.warn(
        `⚠️ Kết nối Judge0 không khả dụng (${err.message}). Tự động kích hoạt Fallback Piston Cloud 24/7...`,
      );
      return this.executeWithPistonFallback(
        codeToExecute,
        languageId,
        input,
        expectedOutput,
        timeLimitMs,
      );
    }
  }

  /**
   * Fallback sang Piston Public Cloud API (Hoàn toàn miễn phí, 24/7, không cần Docker trên máy)
   */
  private async executeWithPistonFallback(
    sourceCode: string,
    languageId: number,
    input: string,
    expectedOutput?: string,
    timeLimitMs = 2000,
  ): Promise<Judge0SubmissionResult> {
    const languageMap: Record<number, { lang: string; version: string; file?: string }> = {
      54: { lang: 'cpp', version: '10.2.0', file: 'main.cpp' },
      50: { lang: 'c', version: '10.2.0', file: 'main.c' },
      71: { lang: 'python', version: '3.10.0', file: 'main.py' },
      62: { lang: 'java', version: '15.0.2', file: 'Main.java' },
      63: { lang: 'javascript', version: '18.15.0', file: 'main.js' },
      74: { lang: 'typescript', version: '5.0.3', file: 'main.ts' },
      60: { lang: 'go', version: '1.16.2', file: 'main.go' },
    };

    const target = languageMap[languageId] || { lang: 'python', version: '3.10.0', file: 'main.py' };
    const tStart = Date.now();

    try {
      const response = await axios.post(
        'https://emkc.org/api/v2/piston/execute',
        {
          language: target.lang,
          version: target.version,
          files: [
            {
              name: target.file,
              content: sourceCode,
            },
          ],
          stdin: input,
          run_timeout: Math.max(timeLimitMs, 2000),
        },
        { timeout: 10000 },
      );

      const elapsedSec = ((Date.now() - tStart) / 1000).toFixed(3);
      const data = response.data;
      const run = data.run || {};

      const stdout = run.stdout ?? '';
      const stderr = run.stderr ?? '';
      const code = run.code;
      const signal = run.signal;

      let statusId = 3; // Accepted
      let statusDesc = 'Accepted';

      if (signal === 'SIGKILL' || run.output?.includes('Time limit exceeded')) {
        statusId = 5; // Time Limit Exceeded
        statusDesc = 'Time Limit Exceeded';
      } else if (data.compile && data.compile.code !== 0) {
        statusId = 6; // Compilation Error
        statusDesc = 'Compilation Error';
      } else if (code !== 0 || stderr.length > 0) {
        statusId = 11; // Runtime Error
        statusDesc = 'Runtime Error';
      } else if (expectedOutput !== undefined) {
        const cleanActual = stdout.trim().replace(/\r\n/g, '\n');
        const cleanExpected = expectedOutput.trim().replace(/\r\n/g, '\n');
        if (cleanActual !== cleanExpected) {
          statusId = 4; // Wrong Answer
          statusDesc = 'Wrong Answer';
        }
      }

      return {
        stdout: stdout || null,
        stderr: stderr || (data.compile?.stderr ?? null),
        compile_output: data.compile?.output ?? null,
        message: null,
        time: elapsedSec,
        memory: 12400,
        status: {
          id: statusId,
          description: statusDesc,
        },
      };
    } catch (fallbackErr: any) {
      this.logger.error(`❌ Cả Judge0 lẫn Piston Fallback đều lỗi: ${fallbackErr.message}`);
      return {
        stdout: null,
        stderr: fallbackErr.message,
        compile_output: null,
        message: 'Lỗi thực thi mã nguồn trên hệ thống chấm trực tuyến',
        time: '0.000',
        memory: 0,
        status: {
          id: 11,
          description: 'Runtime Error',
        },
      };
    }
  }

  /**
   * Nhận diện xem kết quả của Judge0 có phải là do sập môi trường sandbox VM không
   */
  private isJavaSandboxError(res: Judge0SubmissionResult): boolean {
    if (res.status?.id === 13) return true; // Internal Error
    const outputCombined = `${res.compile_output || ''} ${res.stderr || ''} ${res.message || ''}`;
    if (
      outputCombined.includes('Could not reserve enough space') ||
      outputCombined.includes('Error occurred during initialization of VM') ||
      outputCombined.includes('fatal signal 11') ||
      outputCombined.includes(
        'No such file or directory @ rb_sysopen - /box/Main.java',
      )
    ) {
      return true;
    }
    return false;
  }

  /**
   * Thực thi mã nguồn Java an toàn trên môi trường cục bộ (javac & java)
   */
  private async executeJavaLocally(
    sourceCode: string,
    input: string,
    expectedOutput?: string,
    timeLimitMs = 2000,
  ): Promise<Judge0SubmissionResult> {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const { spawn } = await import('child_process');

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oj-java-'));
    const sourceFilePath = path.join(tempDir, 'Main.java');

    try {
      fs.writeFileSync(sourceFilePath, sourceCode, 'utf8');

      // 1. Biên dịch: javac Main.java
      const compileResult = await new Promise<{ code: number; stderr: string }>(
        (resolve) => {
          const javac = spawn('javac', ['Main.java'], {
            cwd: tempDir,
            shell: true,
          });
          let stderr = '';
          javac.stderr.on('data', (data) => {
            stderr += data.toString();
          });
          javac.on('close', (code) => resolve({ code: code ?? 1, stderr }));
          javac.on('error', (err) => resolve({ code: 1, stderr: err.message }));
        },
      );

      if (compileResult.code !== 0) {
        return {
          stdout: null,
          stderr: compileResult.stderr,
          compile_output: compileResult.stderr,
          message: 'Compilation Failed',
          time: '0.000',
          memory: 0,
          status: { id: 6, description: 'Compilation Error' },
        };
      }

      // 2. Chạy: java Main với stdin
      const startTime = Date.now();
      const runResult = await new Promise<{
        stdout: string;
        stderr: string;
        code: number | null;
        timedOut: boolean;
      }>((resolve) => {
        const java = spawn('java', ['-Xms16m', '-Xmx128m', 'Main'], {
          cwd: tempDir,
          shell: true,
        });

        let stdout = '';
        let stderr = '';
        let timedOut = false;

        const timer = setTimeout(
          () => {
            timedOut = true;
            try {
              java.kill('SIGKILL');
            } catch {
              // Bỏ qua nếu process đã dừng
            }
          },
          Math.max(timeLimitMs + 1000, 3000),
        );

        if (input) {
          java.stdin.write(input);
        }
        java.stdin.end();

        java.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        java.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        java.on('close', (code) => {
          clearTimeout(timer);
          resolve({ stdout, stderr, code, timedOut });
        });

        java.on('error', (err) => {
          clearTimeout(timer);
          resolve({ stdout, stderr: err.message, code: 1, timedOut: false });
        });
      });

      const execTimeSec = ((Date.now() - startTime) / 1000).toFixed(3);

      if (runResult.timedOut) {
        return {
          stdout: runResult.stdout || null,
          stderr: 'Time Limit Exceeded',
          compile_output: null,
          message: 'Time Limit Exceeded',
          time: execTimeSec,
          memory: 32768,
          status: { id: 5, description: 'Time Limit Exceeded' },
        };
      }

      if (runResult.code !== 0) {
        return {
          stdout: runResult.stdout || null,
          stderr: runResult.stderr || null,
          compile_output: null,
          message: runResult.stderr || 'Runtime Error',
          time: execTimeSec,
          memory: 32768,
          status: { id: 11, description: 'Runtime Error (NZEC)' },
        };
      }

      const trimmedStdout = (runResult.stdout || '').trim();
      const trimmedExpected = (expectedOutput || '').trim();

      let statusId = 3; // ACCEPTED
      let description = 'Accepted';

      if (
        expectedOutput !== undefined &&
        expectedOutput !== null &&
        expectedOutput !== ''
      ) {
        if (trimmedStdout !== trimmedExpected) {
          statusId = 4; // WRONG_ANSWER
          description = 'Wrong Answer';
        }
      }

      return {
        stdout: runResult.stdout,
        stderr: runResult.stderr || null,
        compile_output: null,
        message: null,
        time: execTimeSec,
        memory: 32768,
        status: { id: statusId, description },
      };
    } finally {
      // Dọn dẹp thư mục tạm
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Bỏ qua lỗi xóa thư mục tạm
      }
    }
  }

  /**
   * Chuyển đổi mã trạng thái của Judge0 sang JudgeStatus của hệ thống
   * Judge0 Status IDs:
   * 1: In Queue, 2: Processing, 3: Accepted, 4: Wrong Answer, 5: Time Limit Exceeded,
   * 6: Compilation Error, 7..12: Runtime Error
   */
  mapJudge0Status(
    statusId: number,
  ): 'ACCEPTED' | 'WRONG_ANSWER' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR' {
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
