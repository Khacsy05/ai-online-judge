import { PrismaClient, Role, JudgeStatus, Classroom, User } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';

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
  console.log('🚀 Start seeding database...');

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
      password: 'giangvien123', // plain text for now; update once Auth/hashing is implemented
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
  console.log('✅ Classroom memberships for Lecturer registered.');

  // 4. Create 60 Students (20 for each classroom)
  console.log('👥 Creating 60 students (20 per class) and joining classrooms...');
  const students: User[] = [];
  
  for (let i = 1; i <= 60; i++) {
    const studentIdx = String(i).padStart(2, '0');
    const student = await prisma.user.create({
      data: {
        email: `student${studentIdx}@gmail.com`,
        password: 'password123',
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

  // 5. Create Problems and Test Cases
  console.log('📝 Creating problems with test cases...');
  
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
      title: 'Kiểm tra chuỗi đối xứng',
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

  console.log('✅ Problems and test cases created successfully.');

  // 6. Create Assignments with different times
  console.log('📅 Creating assignments with varying schedules...');
  const now = new Date();

  // Classroom 1 (64CNTT_VA): Two Active/Ongoing Assignments
  const assign1 = await prisma.assignment.create({
    data: {
      classroomId: classrooms[0].id,
      problemId: p1.id,
      startTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // Started 3 days ago
      deadline: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),  // Deadline in 4 days
      isPublished: true,
    },
  });

  const assign2 = await prisma.assignment.create({
    data: {
      classroomId: classrooms[0].id,
      problemId: p2.id,
      startTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // Started 2 days ago
      deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),  // Deadline in 5 days
      isPublished: true,
    },
  });

  // Classroom 2 (64CNTT_CLC): Two Ended/Past Assignments
  const assign3 = await prisma.assignment.create({
    data: {
      classroomId: classrooms[1].id,
      problemId: p2.id,
      startTime: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // Started 10 days ago
      deadline: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),   // Ended 3 days ago
      isPublished: true,
    },
  });

  const assign4 = await prisma.assignment.create({
    data: {
      classroomId: classrooms[1].id,
      problemId: p3.id,
      startTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),  // Started 7 days ago
      deadline: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),   // Ended 1 day ago
      isPublished: true,
    },
  });

  // Classroom 3 (64CNTT_1): One active, One Scheduled/Future Assignment
  const assign5 = await prisma.assignment.create({
    data: {
      classroomId: classrooms[2].id,
      problemId: p3.id,
      startTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),  // Started 1 day ago
      deadline: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),   // Deadline in 6 days
      isPublished: true,
    },
  });

  const assign6 = await prisma.assignment.create({
    data: {
      classroomId: classrooms[2].id,
      problemId: p4.id,
      startTime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),  // Starts in 1 day
      deadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),   // Ends in 7 days
      isPublished: true,
    },
  });

  console.log('✅ Assignments registered.');

  // 7. Create Submissions (mocking some completed/successful ones and some failures)
  console.log('💻 Mocking user submissions...');

  // Classroom 1 - Student 01 submits to Two Sum -> ACCEPTED (Score: 10/10)
  const sub1 = await prisma.submission.create({
    data: {
      userId: students[0].id,
      assignmentId: assign1.id,
      sourceCode: '#include <iostream>\nusing namespace std;\nint main() {\n    long long a, b;\n    if (cin >> a >> b) {\n        cout << a + b << endl;\n    }\n    return 0;\n}',
      language: 'cpp',
      status: JudgeStatus.ACCEPTED,
      totalScore: 10.0,
      executionTimeMs: 42,
      memoryUsedKb: 2048,
    },
  });

  for (const tc of p1.testCases) {
    await prisma.submissionDetail.create({
      data: {
        submissionId: sub1.id,
        testCaseId: tc.id,
        status: JudgeStatus.ACCEPTED,
        actualOutput: tc.expectedOutput,
        executionTimeMs: 14,
      },
    });
  }

  // Classroom 1 - Student 02 submits to Two Sum -> WRONG_ANSWER (Score: 6/10 - fails hidden case)
  const sub2 = await prisma.submission.create({
    data: {
      userId: students[1].id,
      assignmentId: assign1.id,
      sourceCode: 'a, b = map(int, input().split())\nprint(a + b if a < 1000000 else 0)',
      language: 'python',
      status: JudgeStatus.WRONG_ANSWER,
      totalScore: 6.0,
      executionTimeMs: 85,
      memoryUsedKb: 4096,
    },
  });

  await prisma.submissionDetail.create({
    data: {
      submissionId: sub2.id,
      testCaseId: p1.testCases[0].id,
      status: JudgeStatus.ACCEPTED,
      actualOutput: p1.testCases[0].expectedOutput,
      executionTimeMs: 25,
    },
  });
  await prisma.submissionDetail.create({
    data: {
      submissionId: sub2.id,
      testCaseId: p1.testCases[1].id,
      status: JudgeStatus.ACCEPTED,
      actualOutput: p1.testCases[1].expectedOutput,
      executionTimeMs: 28,
    },
  });
  await prisma.submissionDetail.create({
    data: {
      submissionId: sub2.id,
      testCaseId: p1.testCases[2].id, // Hidden test case
      status: JudgeStatus.WRONG_ANSWER,
      actualOutput: '0',
      errorMessage: 'Expected 3000000, got 0',
      executionTimeMs: 32,
    },
  });

  // Classroom 1 - Student 03 submits to Two Sum -> ACCEPTED (Score: 10/10)
  const sub3 = await prisma.submission.create({
    data: {
      userId: students[2].id,
      assignmentId: assign1.id,
      sourceCode: 'import sys\na, b = map(int, sys.stdin.read().split())\nprint(a + b)',
      language: 'python',
      status: JudgeStatus.ACCEPTED,
      totalScore: 10.0,
      executionTimeMs: 70,
      memoryUsedKb: 4112,
    },
  });

  for (const tc of p1.testCases) {
    await prisma.submissionDetail.create({
      data: {
        submissionId: sub3.id,
        testCaseId: tc.id,
        status: JudgeStatus.ACCEPTED,
        actualOutput: tc.expectedOutput,
        executionTimeMs: 23,
      },
    });
  }

  // Classroom 1 - Student 01 submits to Prime Check -> ACCEPTED (Score: 10/10)
  const sub4 = await prisma.submission.create({
    data: {
      userId: students[0].id,
      assignmentId: assign2.id,
      sourceCode: '#include <iostream>\nusing namespace std;\nbool isPrime(int n) {\n    if (n < 2) return false;\n    for (int i = 2; i * i <= n; i++) {\n        if (n % i == 0) return false;\n    }\n    return true;\n}\nint main() {\n    int n;\n    if (cin >> n) {\n        cout << (isPrime(n) ? "YES" : "NO") << endl;\n    }\n    return 0;\n}',
      language: 'cpp',
      status: JudgeStatus.ACCEPTED,
      totalScore: 10.0,
      executionTimeMs: 35,
      memoryUsedKb: 2048,
    },
  });

  for (const tc of p2.testCases) {
    await prisma.submissionDetail.create({
      data: {
        submissionId: sub4.id,
        testCaseId: tc.id,
        status: JudgeStatus.ACCEPTED,
        actualOutput: tc.expectedOutput,
        executionTimeMs: 11,
      },
    });
  }

  // Classroom 2 - Student 21 submits to Prime Check -> ACCEPTED (Score: 10/10)
  const sub5 = await prisma.submission.create({
    data: {
      userId: students[20].id,
      assignmentId: assign3.id,
      sourceCode: '#include <iostream>\nusing namespace std;\nbool isPrime(int n) {\n    if (n < 2) return false;\n    for (int i = 2; i * i <= n; i++) {\n        if (n % i == 0) return false;\n    }\n    return true;\n}\nint main() {\n    int n;\n    if (cin >> n) {\n        cout << (isPrime(n) ? "YES" : "NO") << endl;\n    }\n    return 0;\n}',
      language: 'cpp',
      status: JudgeStatus.ACCEPTED,
      totalScore: 10.0,
      executionTimeMs: 38,
      memoryUsedKb: 2048,
    },
  });

  for (const tc of p2.testCases) {
    await prisma.submissionDetail.create({
      data: {
        submissionId: sub5.id,
        testCaseId: tc.id,
        status: JudgeStatus.ACCEPTED,
        actualOutput: tc.expectedOutput,
        executionTimeMs: 12,
      },
    });
  }

  console.log('✅ Submissions simulated successfully.');
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
