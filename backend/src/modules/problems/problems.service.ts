import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { QueryProblemsDto } from './dto/query-problems.dto';
import { GenerateBoundaryTestsDto } from './dto/generate-boundary-tests.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { Judge0Service } from '../submissions/judge0.service';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class ProblemsService {
  private readonly logger = new Logger(ProblemsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly judge0Service: Judge0Service,
  ) { }

  async create(createProblemDto: CreateProblemDto) {
    const { title, description, timeLimitMs, memoryLimitMb, authorId, testCases } = createProblemDto;

    // Nếu chưa có authorId truyền vào, lấy user admin đầu tiên trong DB
    let finalAuthorId = authorId;
    if (!finalAuthorId) {
      const defaultUser = await this.prisma.user.findFirst();
      if (!defaultUser) {
        throw new NotFoundException('Không tìm thấy người dùng nào trong hệ thống để gán tác giả.');
      }
      finalAuthorId = defaultUser.id;
    }

    return this.prisma.problem.create({
      data: {
        title: title.trim(),
        description: description?.trim() || '',
        timeLimitMs: Number(timeLimitMs) || 1000,
        memoryLimitMb: Number(memoryLimitMb) || 256,
        authorId: finalAuthorId,
        testCases: testCases && testCases.length > 0 ? {
          create: testCases.map((tc) => ({
            input: tc.input || '',
            expectedOutput: tc.expectedOutput || '',
            isHidden: tc.isHidden !== undefined ? tc.isHidden : true,
          })),
        } : undefined,
      },
      include: {
        testCases: true,
        author: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  }

  async findAll(query?: QueryProblemsDto) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 8;
    const search = query?.search?.trim();

    const whereCondition: any = {};
    if (search) {
      whereCondition.title = { contains: search };
    }

    const [items, total] = await Promise.all([
      this.prisma.problem.findMany({
        where: whereCondition,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              testCases: true,
              assignments: true,
            },
          },
          assignments: {
            select: {
              _count: {
                select: {
                  submissions: true,
                },
              },
            },
          },
          author: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.problem.count({
        where: whereCondition,
      }),
    ]);

    const formattedItems = items.map((p) => {
      const totalSubmissions = p.assignments.reduce(
        (sum, a) => sum + (a._count?.submissions || 0),
        0,
      );
      const { assignments, ...rest } = p;
      return {
        ...rest,
        _count: {
          ...rest._count,
          submissions: totalSubmissions,
        },
      };
    });

    return {
      items: formattedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { id },
      include: {
        testCases: true,
        author: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!problem) {
      throw new NotFoundException(`Không tìm thấy bài tập với ID: "${id}"`);
    }

    return problem;
  }

  async update(id: string, updateProblemDto: UpdateProblemDto) {
    const problem = await this.prisma.problem.findUnique({ where: { id } });
    if (!problem) {
      throw new NotFoundException(`Không tìm thấy bài tập với ID: "${id}"`);
    }

    const { title, description, timeLimitMs, memoryLimitMb, testCases } = updateProblemDto;

    return this.prisma.$transaction(async (tx) => {
      // Nếu có danh sách testCases mới, cập nhật thông minh (Upsert / Delete an toàn)
      if (testCases) {
        // Lấy danh sách testCases hiện tại trong DB
        const existingTestCases = await tx.testCase.findMany({
          where: { problemId: id },
          select: { id: true },
        });
        const existingIds = new Set(existingTestCases.map((tc) => tc.id));

        // 1. Phân loại các testCase gửi lên: Có ID hợp lệ sẵn -> Cập nhật; Chưa có ID -> Tạo mới
        const sentIds = new Set<string>();
        const toCreate: Array<{
          problemId: string;
          input: string;
          expectedOutput: string;
          isHidden: boolean;
        }> = [];

        for (const tc of testCases) {
          if (tc.id && existingIds.has(tc.id)) {
            sentIds.add(tc.id);
            // Cập nhật test case hiện có (giữ nguyên ID để không vỡ liên kết SubmissionDetail)
            await tx.testCase.update({
              where: { id: tc.id },
              data: {
                input: tc.input || '',
                expectedOutput: tc.expectedOutput || '',
                isHidden: tc.isHidden !== undefined ? tc.isHidden : true,
              },
            });
          } else {
            toCreate.push({
              problemId: id,
              input: tc.input || '',
              expectedOutput: tc.expectedOutput || '',
              isHidden: tc.isHidden !== undefined ? tc.isHidden : true,
            });
          }
        }

        // 2. Với các test case cũ không còn trong danh sách gửi lên:
        const toDeleteIds = existingTestCases
          .filter((tc) => !sentIds.has(tc.id))
          .map((tc) => tc.id);

        if (toDeleteIds.length > 0) {
          // Kiểm tra xem test case nào đã có bài nộp tham chiếu đến
          const referencedDetails = await tx.submissionDetail.findMany({
            where: { testCaseId: { in: toDeleteIds } },
            select: { testCaseId: true },
            distinct: ['testCaseId'],
          });
          const referencedIds = new Set(referencedDetails.map((d) => d.testCaseId));

          // Chỉ xóa các test case KHÔNG bị bài nộp nào tham chiếu
          const safeDeleteIds = toDeleteIds.filter((tid) => !referencedIds.has(tid));
          if (safeDeleteIds.length > 0) {
            await tx.testCase.deleteMany({
              where: { id: { in: safeDeleteIds } },
            });
          }

          // Các test case đã bị bài nộp tham chiếu nhưng người dùng bỏ khỏi danh sách:
          // Đánh dấu ẩn (isHidden = true) để không ảnh hưởng đến sinh viên và giữ nguyên lịch sử bài nộp cũ
          const cannotDeleteIds = toDeleteIds.filter((tid) => referencedIds.has(tid));
          if (cannotDeleteIds.length > 0) {
            await tx.testCase.updateMany({
              where: { id: { in: cannotDeleteIds } },
              data: { isHidden: true },
            });
          }
        }

        // 3. Tạo mới các test case được thêm mới
        if (toCreate.length > 0) {
          await tx.testCase.createMany({
            data: toCreate,
          });
        }
      }

      return tx.problem.update({
        where: { id },
        data: {
          title: title !== undefined ? title.trim() : undefined,
          description: description !== undefined ? description.trim() : undefined,
          timeLimitMs: timeLimitMs !== undefined ? Number(timeLimitMs) : undefined,
          memoryLimitMb: memoryLimitMb !== undefined ? Number(memoryLimitMb) : undefined,
        },
        include: {
          testCases: true,
          author: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });
    });
  }

  async remove(id: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    });

    if (!problem) {
      throw new NotFoundException(`Không tìm thấy bài tập với ID: "${id}"`);
    }

    // Kiểm tra xem bài tập này đã có bài nộp nào chưa (thông qua các Assignment)
    const submissionCount = await this.prisma.submission.count({
      where: {
        assignment: {
          problemId: id,
        },
      },
    });

    if (submissionCount > 0) {
      throw new BadRequestException(
        `Không thể xóa bài tập này vì đã có ${submissionCount} bài nộp của sinh viên. Vui lòng giữ lại để bảo tồn lịch sử chấm điểm.`,
      );
    }

    return this.prisma.problem.delete({
      where: { id },
    });
  }

  /**
   * Gọi script Python phân tích cây cú pháp trừu tượng (AST) của mã nguồn giải mẫu
   */
  private async runAstAnalyzer(sourceCode: string, language: string): Promise<any> {
    return new Promise((resolve) => {
      const possiblePaths = [
        path.join(process.cwd(), 'scripts', 'ast_analyzer.py'),
        path.join(process.cwd(), 'backend', 'scripts', 'ast_analyzer.py'),
        path.join(__dirname, '..', '..', '..', 'scripts', 'ast_analyzer.py'),
      ];
      const scriptPath = possiblePaths.find((p) => fs.existsSync(p));

      if (!scriptPath) {
        this.logger.warn('Không tìm thấy file scripts/ast_analyzer.py');
        return resolve({
          success: false,
          error: 'Không tìm thấy file scripts/ast_analyzer.py',
          conditions: [],
          special_constants: [0, 1, -1],
        });
      }

      const child = spawn('python', [scriptPath], {
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString('utf-8');
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString('utf-8');
      });

      child.on('close', (code) => {
        if (code !== 0 && !stdout.trim()) {
          this.logger.error(`Lỗi thực thi AST Analyzer (code ${code}): ${stderr}`);
          return resolve({
            success: false,
            error: stderr || `Process exited with code ${code}`,
            conditions: [],
            special_constants: [0, 1, -1],
          });
        }
        try {
          const parsed = JSON.parse(stdout);
          resolve(parsed);
        } catch (err) {
          this.logger.error(`Lỗi parse JSON output từ AST Analyzer: ${err.message}`);
          resolve({
            success: false,
            error: `Lỗi parse JSON output từ AST: ${err.message}`,
            raw: stdout,
            conditions: [],
            special_constants: [0, 1, -1],
          });
        }
      });

      child.on('error', (err) => {
        this.logger.error(`Không thể spawn tiến trình Python cho AST: ${err.message}`);
        resolve({
          success: false,
          error: `Không thể khởi chạy Python: ${err.message}`,
          conditions: [],
          special_constants: [0, 1, -1],
        });
      });

      child.stdin.write(JSON.stringify({ sourceCode, language }));
      child.stdin.end();
    });
  }

  /**
   * Tự động sinh ca kiểm thử biên (Boundary Test Cases)
   * Kết hợp: AST (Phân tích tĩnh) + LLM Gemini + Judge0 Sandbox (Oracle)
   */
  async generateBoundaryTests(dto: GenerateBoundaryTestsDto) {
    const { problemTitle, problemDescription, solutionCode, language, numCases = 5 } = dto;
    const languageId = this.judge0Service.getLanguageId(language);
    if (!languageId) {
      throw new BadRequestException(`Ngôn ngữ "${language}" chưa được hỗ trợ bởi Judge0.`);
    }

    this.logger.log(`Bắt đầu phân tích AST cho bài toán "${problemTitle}" (${language})...`);

    // 1. Phân tích AST của mã nguồn giải mẫu
    const astReport = await this.runAstAnalyzer(solutionCode, language);

    this.logger.log(
      `AST hoàn tất: phát hiện ${astReport?.conditions?.length || 0} điều kiện rẽ nhánh và ${astReport?.special_constants?.length || 0} mốc biên.`,
    );

    // 2. Định dạng Prompt kèm tri thức trích xuất từ AST (Context Enrichment)
    const schema = {
      type: 'OBJECT',
      properties: {
        cases: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING' },
              category: { type: 'STRING' },
              description: { type: 'STRING' },
              input: { type: 'STRING' },
            },
            required: ['name', 'input'],
          },
        },
      },
      required: ['cases'],
    };

    const prompt = `
Bạn là một chuyên gia Kiểm thử phần mềm (QA / Software Testing Engineer) cho hệ thống Online Judge.
Nhiệm vụ của bạn là sinh ra các ca kiểm thử BIÊN (Boundary Value Test Cases / Corner Cases / Edge Cases) chất lượng cao để phát hiện các lỗi lập trình tiềm ẩn của sinh viên (như lỗi sai dấu < vs <=, bỏ sót N=0, mảng rỗng, tràn số 32-bit, số âm, phần tử trùng lặp).

=== 1. THÔNG TIN ĐỀ BÀI (RẤT QUAN TRỌNG) ===
- Tiêu đề bài tập: ${problemTitle}
- Mô tả bài toán, quy cách Input/Output & Ràng buộc miền giá trị:
${problemDescription}

=== 2. MÃ NGUỒN GIẢI MẪU (REFERENCE SOLUTION) ===
Ngôn ngữ: ${language}
Mã nguồn:
\`\`\`${language}
${solutionCode}
\`\`\`

=== 3. TRI THỨC TRÍCH XUẤT TỪ CÂY CÚ PHÁP TRỪU TƯỢNG (AST) ===
- Các điều kiện rẽ nhánh và mốc so sánh trích xuất từ AST:
${JSON.stringify(astReport?.conditions || [], null, 2)}
- Các hằng số biên quan trọng trong code: ${JSON.stringify(astReport?.special_constants || [0, 1, -1])}

=== 4. QUY TẮC BẮT BUỘC KHI SINH TEST CASE ===
1. ĐỌC KỸ MÔ TẢ ĐỀ BÀI: Phân tích kỹ xem đề bài yêu cầu nhập (stdin) như thế nào (Ví dụ: dòng 1 là N, dòng 2 là dãy số cách nhau dấu cách; hoặc nhiều dòng; định dạng chuỗi hay số...).
2. ĐỐI CHIẾU VỚI CÁCH ĐỌC DỮ LIỆU CỦA CODE MẪU: Xem hàm đọc dữ liệu trong code mẫu (input(), cin, Scanner, sys.stdin...) để đảm bảo input bạn sinh ra KHÔNG LÀM CODE MẪU BỊ LỖI RUNTIME (ValueError, NoSuchElementException, EOFError).
3. ĐÚNG SỐ LƯỢNG: Sinh đúng ${numCases} bộ test case BIÊN quan trọng và bao phủ tốt nhất.
4. BAO PHỦ CÁC MỐC BIÊN (BOUNDARY VALUE ANALYSIS):
   - Biên dưới cùng (Min hợp lệ của N, mảng 0 hoặc 1 phần tử nếu đề bài cho phép).
   - Biên trên cùng (Max của N theo ràng buộc đề bài, hoặc cận cực đại).
   - Các giá trị âm, 0, số cực lớn, hoặc phần tử giống hệt nhau nếu đề bài cho phép.
   - Các nhánh rẽ nhánh mà cây AST đã phát hiện.
5. CHUỖI \`input\` HOÀN CHỈNH: Chuỗi \`input\` (stdin) phải chứa đầy đủ các dòng, đúng khoảng trắng, kết thúc bằng ký tự xuống dòng '\\n'.
6. Đặt tên \`name\` và \`description\` rõ ràng giải thích tại sao test case này lại là ca kiểm thử biên quan trọng.
`;

    const aiResponse = await this.aiService.generateJson<{
      cases: Array<{ name: string; category?: string; description?: string; input: string }>;
    }>(prompt, schema);

    const generatedCases = aiResponse?.cases || [];
    this.logger.log(`Gemini đã tạo ${generatedCases.length} bộ Input biên. Đang thực thi qua Judge0...`);

    // 3. Thực thi từng input với Solution Code trên Judge0 để lấy stdout làm expectedOutput chuẩn xác 100%
    const finalizedTestCases: any[] = [];

    for (let i = 0; i < generatedCases.length; i++) {
      const tc = generatedCases[i];
      let cleanInput = tc.input ?? '';
      // Đảm bảo kết thúc bằng dấu xuống dòng nếu chưa có
      if (cleanInput && !cleanInput.endsWith('\n')) {
        cleanInput += '\n';
      }

      try {
        const judgeResult = await this.judge0Service.executeSingleTestCase(
          solutionCode,
          languageId,
          cleanInput,
        );

        let output = judgeResult.stdout || '';
        output = output.trim();

        finalizedTestCases.push({
          name: tc.name || `Biên test #${i + 1}`,
          category: tc.category || 'boundary_case',
          description: tc.description || '',
          input: cleanInput,
          expectedOutput: output,
          isHidden: true,
          score: 1.0,
          judgeStatus: judgeResult.status?.description || 'SUCCESS',
          executionTime: judgeResult.time,
          memoryUsed: judgeResult.memory,
        });
      } catch (judgeErr) {
        this.logger.warn(`Lỗi khi thực thi testcase #${i + 1} qua Judge0: ${judgeErr.message}`);
        finalizedTestCases.push({
          name: tc.name || `Biên test #${i + 1}`,
          category: tc.category || 'boundary_case',
          description: tc.description || '',
          input: cleanInput,
          expectedOutput: '',
          isHidden: true,
          score: 1.0,
          error: `Judge0 execution warning: ${judgeErr.message}`,
        });
      }
    }

    return {
      success: true,
      astReport,
      testCases: finalizedTestCases,
      summary: `Đã phân tích AST thành công (${astReport.conditions?.length || 0} điều kiện) và sinh ra ${finalizedTestCases.length} test case biên qua Judge0.`,
    };
  }
}


