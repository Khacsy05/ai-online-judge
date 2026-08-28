import { PrismaClient, Role, JudgeStatus, Classroom, User } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';

// Get DB connection config from environment
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

const url = new URL(dbUrl);
const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
const ssl = isLocal ? undefined : { rejectUnauthorized: true };

// Initialize the driver adapter matching NestJS PrismaService configuration
const adapter = new PrismaMariaDb({
  host: url.hostname || 'localhost',
  port: url.port ? parseInt(url.port) : 3306,
  user: decodeURIComponent(url.username) || 'root',
  password: decodeURIComponent(url.password) || undefined,
  database: decodeURIComponent(url.pathname.substring(1)),
  ssl,
  connectTimeout: 10000,
  acquireTimeout: 15000,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🚀 Start seeding database with rich data for Leaderboard testing...');

  // Pre-hash passwords to match Auth/bcryptjs requirements
  const adminPasswordHash = await bcrypt.hash('giangvien123', 10);
  const studentPasswordHash = await bcrypt.hash('password123', 10);

  // 1. Clean up old data in reverse order of foreign key relationships
  console.log('🧹 Cleaning up old data...');
  await prisma.submissionDetail.deleteMany({});
  await prisma.submission.deleteMany({});
  await prisma.testCase.deleteMany({});
  await prisma.assignment.deleteMany({});
  await prisma.problem.deleteMany({});
  await prisma.classroomMember.deleteMany({});
  await prisma.classroom.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('✅ Cleanup finished.');

  // 2. Create Lecturer (Admin)
  console.log('🧑‍🏫 Creating lecturer (Admin)...');
  const lecturer = await prisma.user.create({
    data: {
      email: 'giangvien@gmail.com',
      password: adminPasswordHash,
      fullName: 'TS. Nguyễn Văn A',
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Lecturer created: ${lecturer.fullName} (ID: ${lecturer.id})`);

  // 3. Create 3 Classrooms
  console.log('🏫 Creating classrooms...');
  const classroomData = [
    { code: '64CNTT_VA', name: 'Phát triển ứng dụng Web' },
    { code: '64CNTT_CLC', name: 'Cấu trúc dữ liệu và Giải thuật' },
    { code: '64CNTT_1', name: 'Lập trình nâng cao' },
  ];

  const classrooms: Classroom[] = [];
  for (const item of classroomData) {
    const cl = await prisma.classroom.create({
      data: item,
    });
    classrooms.push(cl);
    console.log(`   - Classroom created: [${cl.code}] ${cl.name}`);
  }

  // Add the Lecturer as a member of each classroom to ensure access/visibility
  for (const cl of classrooms) {
    await prisma.classroomMember.create({
      data: {
        userId: lecturer.id,
        classroomId: cl.id,
      },
    });
  }

  // 4. Create 60 Students (20 for each classroom)
  console.log('👥 Creating 60 students (20 per class) and joining classrooms...');
  const students: User[] = [];
  
  for (let i = 1; i <= 60; i++) {
    const studentIdx = String(i).padStart(2, '0');
    const student = await prisma.user.create({
      data: {
        email: `student${studentIdx}@gmail.com`,
        password: studentPasswordHash,
        fullName: `Sinh viên ${studentIdx}`,
        studentCode: `SV2024${String(i).padStart(4, '0')}`,
        role: Role.STUDENT,
      },
    });
    students.push(student);

    // Grouping: students 1-20 -> Class 0, 21-40 -> Class 1, 41-60 -> Class 2
    const classroomIndex = Math.floor((i - 1) / 20);
    const targetClassroom = classrooms[classroomIndex];

    await prisma.classroomMember.create({
      data: {
        userId: student.id,
        classroomId: targetClassroom.id,
      },
    });
  }
  console.log(`✅ 60 students created and assigned to respective classrooms.`);

  // 5. Create 8 Diverse Problems with Multiple Test Cases
  console.log('📝 Creating 8 problems with rich test cases...');
  
  // Problem 1: Two Sum
  const p1 = await prisma.problem.create({
    data: {
      title: 'Tính tổng 2 số (A + B)',
      description: 'Cho hai số nguyên A và B từ đầu vào tiêu chuẩn. Hãy tính và in ra tổng của chúng.',
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      authorId: lecturer.id,
      testCases: {
        create: [
          { input: '5 10', expectedOutput: '15', isHidden: false, score: 3.0 },
          { input: '-3 8', expectedOutput: '5', isHidden: false, score: 3.0 },
          { input: '1000000 2000000', expectedOutput: '3000000', isHidden: true, score: 4.0 },
        ],
      },
    },
    include: { testCases: true },
  });

  // Problem 2: Check Prime
  const p2 = await prisma.problem.create({
    data: {
      title: 'Kiểm tra số nguyên tố',
      description: 'Cho số nguyên dương N. Hãy kiểm tra xem N có phải là số nguyên tố hay không. In ra YES hoặc NO.',
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      authorId: lecturer.id,
      testCases: {
        create: [
          { input: '7', expectedOutput: 'YES', isHidden: false, score: 3.0 },
          { input: '10', expectedOutput: 'NO', isHidden: false, score: 3.0 },
          { input: '7919', expectedOutput: 'YES', isHidden: true, score: 4.0 },
        ],
      },
    },
    include: { testCases: true },
  });

  // Problem 3: Fibonacci
  const p3 = await prisma.problem.create({
    data: {
      title: 'Số Fibonacci thứ N',
      description: 'Tìm số Fibonacci thứ N (0 <= N <= 30). Biết F(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2).',
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      authorId: lecturer.id,
      testCases: {
        create: [
          { input: '5', expectedOutput: '5', isHidden: false, score: 3.0 },
          { input: '10', expectedOutput: '55', isHidden: false, score: 3.0 },
          { input: '30', expectedOutput: '832040', isHidden: true, score: 4.0 },
        ],
      },
    },
    include: { testCases: true },
  });

  // Problem 4: Palindrome
  const p4 = await prisma.problem.create({
    data: {
      title: 'Kiểm tra chuỗi đối xứng (Palindrome)',
      description: 'Cho một chuỗi ký tự S. Kiểm tra xem S có đối xứng (palindrome) hay không. In ra YES hoặc NO.',
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      authorId: lecturer.id,
      testCases: {
        create: [
          { input: 'radar', expectedOutput: 'YES', isHidden: false, score: 3.0 },
          { input: 'hello', expectedOutput: 'NO', isHidden: false, score: 3.0 },
          { input: 'redder', expectedOutput: 'YES', isHidden: true, score: 4.0 },
        ],
      },
    },
    include: { testCases: true },
  });

  // Problem 5: Find Second Largest
  const p5 = await prisma.problem.create({
    data: {
      title: 'Tìm phần tử lớn thứ hai trong mảng',
      description: 'Cho mảng N số nguyên. Hãy tìm và in ra giá trị lớn thứ hai trong mảng. Nếu không tồn tại, in ra -1.',
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      authorId: lecturer.id,
      testCases: {
        create: [
          { input: '5\n1 2 3 4 5', expectedOutput: '4', isHidden: false, score: 3.0 },
          { input: '4\n10 10 10 10', expectedOutput: '-1', isHidden: false, score: 3.0 },
          { input: '6\n5 8 12 3 12 9', expectedOutput: '9', isHidden: true, score: 4.0 },
        ],
      },
    },
    include: { testCases: true },
  });

  // Problem 6: Reverse Array
  const p6 = await prisma.problem.create({
    data: {
      title: 'Đảo ngược mảng số nguyên',
      description: 'Cho mảng gồm N số nguyên. Hãy in ra các phần tử của mảng theo thứ tự đảo ngược.',
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      authorId: lecturer.id,
      testCases: {
        create: [
          { input: '4\n1 2 3 4', expectedOutput: '4 3 2 1', isHidden: false, score: 5.0 },
          { input: '5\n10 20 30 40 50', expectedOutput: '50 40 30 20 10', isHidden: true, score: 5.0 },
        ],
      },
    },
    include: { testCases: true },
  });

  // Problem 7: Factorial
  const p7 = await prisma.problem.create({
    data: {
      title: 'Tính giai thừa N!',
      description: 'Cho số nguyên dương N (1 <= N <= 15). Hãy tính và in ra giá trị N! = 1 * 2 * ... * N.',
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      authorId: lecturer.id,
      testCases: {
        create: [
          { input: '5', expectedOutput: '120', isHidden: false, score: 4.0 },
          { input: '7', expectedOutput: '5040', isHidden: false, score: 3.0 },
          { input: '12', expectedOutput: '479001600', isHidden: true, score: 3.0 },
        ],
      },
    },
    include: { testCases: true },
  });

  // Problem 8: Count Character Occurrences
  const p8 = await prisma.problem.create({
    data: {
      title: 'Đếm số lần xuất hiện của ký tự',
      description: 'Cho một chuỗi S và một ký tự C. Hãy đếm và in ra số lần ký tự C xuất hiện trong chuỗi S.',
      timeLimitMs: 1000,
      memoryLimitMb: 256,
      authorId: lecturer.id,
      testCases: {
        create: [
          { input: 'helloworld l', expectedOutput: '3', isHidden: false, score: 5.0 },
          { input: 'programming g', expectedOutput: '2', isHidden: true, score: 5.0 },
        ],
      },
    },
    include: { testCases: true },
  });

  console.log('✅ 8 Problems created successfully.');

  // 6. Create Assignments for all classrooms
  console.log('📅 Assigning problems to classrooms...');
  const now = new Date();

  // Classroom 1 (64CNTT_VA): Assigned Problems 1, 2, 3, 5
  const c1_a1 = await prisma.assignment.create({
    data: {
      classroomId: classrooms[0].id,
      problemId: p1.id,
      startTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      isPublished: true,
    },
  });

  const c1_a2 = await prisma.assignment.create({
    data: {
      classroomId: classrooms[0].id,
      problemId: p2.id,
      startTime: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      deadline: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      isPublished: true,
    },
  });

  const c1_a3 = await prisma.assignment.create({
    data: {
      classroomId: classrooms[0].id,
      problemId: p3.id,
      startTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      deadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      isPublished: true,
    },
  });

  const c1_a4 = await prisma.assignment.create({
    data: {
      classroomId: classrooms[0].id,
      problemId: p5.id,
      startTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      deadline: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      isPublished: true,
    },
  });

  // Classroom 2 (64CNTT_CLC): Assigned Problems 2, 3, 4, 6
  const c2_a1 = await prisma.assignment.create({
    data: {
      classroomId: classrooms[1].id,
      problemId: p2.id,
      startTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      deadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      isPublished: true,
    },
  });

  const c2_a2 = await prisma.assignment.create({
    data: {
      classroomId: classrooms[1].id,
      problemId: p3.id,
      startTime: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      deadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      isPublished: true,
    },
  });

  const c2_a3 = await prisma.assignment.create({
    data: {
      classroomId: classrooms[1].id,
      problemId: p4.id,
      startTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      deadline: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      isPublished: true,
    },
  });

  // Classroom 3 (64CNTT_1): Assigned Problems 1, 4, 7, 8
  const c3_a1 = await prisma.assignment.create({
    data: {
      classroomId: classrooms[2].id,
      problemId: p1.id,
      startTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      deadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      isPublished: true,
    },
  });

  const c3_a2 = await prisma.assignment.create({
    data: {
      classroomId: classrooms[2].id,
      problemId: p7.id,
      startTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      deadline: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
      isPublished: true,
    },
  });

  console.log('✅ Assignments registered.');

  // 7. Create Submissions (Varying scores to test Classroom Leaderboards)
  console.log('💻 Generating realistic student submissions for Classroom 1 Leaderboard...');

  // Helper to create submissions and details easily
  const createSub = async (
    user: User,
    assignment: any,
    problem: any,
    status: JudgeStatus,
    score: number,
    lang = 'cpp'
  ) => {
    const sub = await prisma.submission.create({
      data: {
        userId: user.id,
        assignmentId: assignment.id,
        sourceCode: `// Code solution submitted by ${user.fullName}\n// Language: ${lang}`,
        language: lang,
        status: status,
        totalScore: score,
        executionTimeMs: Math.floor(Math.random() * 80) + 20,
        memoryUsedKb: 2048 + Math.floor(Math.random() * 2048),
      },
    });

    for (const tc of problem.testCases) {
      await prisma.submissionDetail.create({
        data: {
          submissionId: sub.id,
          testCaseId: tc.id,
          status: status === JudgeStatus.ACCEPTED ? JudgeStatus.ACCEPTED : (Math.random() > 0.5 ? JudgeStatus.ACCEPTED : JudgeStatus.WRONG_ANSWER),
          actualOutput: status === JudgeStatus.ACCEPTED ? tc.expectedOutput : 'wrong_output',
          executionTimeMs: Math.floor(Math.random() * 20) + 5,
        },
      });
    }
    return sub;
  };

  // Student 01 (SV20240001): Super student! Solved all 4 assignments with 10.0 -> Total: 40.0 (Rank 1)
  await createSub(students[0], c1_a1, p1, JudgeStatus.ACCEPTED, 10.0);
  await createSub(students[0], c1_a2, p2, JudgeStatus.ACCEPTED, 10.0);
  await createSub(students[0], c1_a3, p3, JudgeStatus.ACCEPTED, 10.0);
  await createSub(students[0], c1_a4, p5, JudgeStatus.ACCEPTED, 10.0);

  // Student 02 (SV20240002): Solved 3 assignments (10, 10, 10), 1 partial (7.0) -> Total: 37.0 (Rank 2)
  await createSub(students[1], c1_a1, p1, JudgeStatus.ACCEPTED, 10.0);
  await createSub(students[1], c1_a2, p2, JudgeStatus.ACCEPTED, 10.0);
  await createSub(students[1], c1_a3, p3, JudgeStatus.ACCEPTED, 10.0);
  await createSub(students[1], c1_a4, p5, JudgeStatus.WRONG_ANSWER, 7.0);

  // Student 03 (SV20240003): Solved 3 assignments with 10.0 -> Total: 30.0 (Rank 3)
  await createSub(students[2], c1_a1, p1, JudgeStatus.ACCEPTED, 10.0);
  await createSub(students[2], c1_a2, p2, JudgeStatus.ACCEPTED, 10.0);
  await createSub(students[2], c1_a3, p3, JudgeStatus.ACCEPTED, 10.0);

  // Student 04 (SV20240004): Multiple attempts on A1 (First attempt: 6.0, Second attempt: 10.0), A2: 10.0, A3: 8.0 -> Total: 28.0 (Rank 4)
  await createSub(students[3], c1_a1, p1, JudgeStatus.WRONG_ANSWER, 6.0); // Attempt 1
  await createSub(students[3], c1_a1, p1, JudgeStatus.ACCEPTED, 10.0);    // Attempt 2 (Higher!)
  await createSub(students[3], c1_a2, p2, JudgeStatus.ACCEPTED, 10.0);
  await createSub(students[3], c1_a3, p3, JudgeStatus.WRONG_ANSWER, 8.0);

  // Student 05 (SV20240005): Solved A1: 10.0, A2: 10.0, A4: 5.0 -> Total: 25.0 (Rank 5)
  await createSub(students[4], c1_a1, p1, JudgeStatus.ACCEPTED, 10.0);
  await createSub(students[4], c1_a2, p2, JudgeStatus.ACCEPTED, 10.0);
  await createSub(students[4], c1_a4, p5, JudgeStatus.WRONG_ANSWER, 5.0);

  // Student 06 (SV20240006): Solved A1: 10.0, A2: 10.0 -> Total: 20.0, Solved: 2 (Rank 6)
  await createSub(students[5], c1_a1, p1, JudgeStatus.ACCEPTED, 10.0);
  await createSub(students[5], c1_a2, p2, JudgeStatus.ACCEPTED, 10.0);

  // Student 07 (SV20240007): Solved A1: 10.0, A3: 6.0, A4: 4.0 -> Total: 20.0, Solved: 1 (Rank 7 - tie-breaker by solved count)
  await createSub(students[6], c1_a1, p1, JudgeStatus.ACCEPTED, 10.0);
  await createSub(students[6], c1_a3, p3, JudgeStatus.WRONG_ANSWER, 6.0);
  await createSub(students[6], c1_a4, p5, JudgeStatus.WRONG_ANSWER, 4.0);

  // Student 08 (SV20240008): Solved A1: 10.0, A2: 7.0 -> Total: 17.0 (Rank 8)
  await createSub(students[7], c1_a1, p1, JudgeStatus.ACCEPTED, 10.0);
  await createSub(students[7], c1_a2, p2, JudgeStatus.WRONG_ANSWER, 7.0);

  // Student 09 (SV20240009): Solved A1: 10.0, A3: 5.0 -> Total: 15.0 (Rank 9)
  await createSub(students[8], c1_a1, p1, JudgeStatus.ACCEPTED, 10.0);
  await createSub(students[8], c1_a3, p3, JudgeStatus.WRONG_ANSWER, 5.0);

  // Student 10 (SV20240010): Solved A1: 10.0 -> Total: 10.0 (Rank 10)
  await createSub(students[9], c1_a1, p1, JudgeStatus.ACCEPTED, 10.0);

  // Student 11 (SV20240011): A1: 6.0 -> Total: 6.0 (Rank 11)
  await createSub(students[10], c1_a1, p1, JudgeStatus.WRONG_ANSWER, 6.0);

  // Student 12 (SV20240012): A1: Compile Error -> Total: 0.0 (Rank 12)
  await createSub(students[11], c1_a1, p1, JudgeStatus.COMPILATION_ERROR, 0.0);

  // Students 13-20: Haven't submitted anything yet -> Total: 0.0

  // Mock submissions for Classroom 2 (64CNTT_CLC)
  console.log('💻 Generating mock submissions for Classroom 2...');
  await createSub(students[20], c2_a1, p2, JudgeStatus.ACCEPTED, 10.0);
  await createSub(students[20], c2_a2, p3, JudgeStatus.ACCEPTED, 10.0);
  await createSub(students[20], c2_a3, p4, JudgeStatus.ACCEPTED, 10.0);

  await createSub(students[21], c2_a1, p2, JudgeStatus.ACCEPTED, 10.0);
  await createSub(students[21], c2_a2, p3, JudgeStatus.WRONG_ANSWER, 7.0);

  await createSub(students[22], c2_a1, p2, JudgeStatus.ACCEPTED, 10.0);

  console.log('✅ Submissions generated successfully with realistic rankings.');
  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding: ', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });