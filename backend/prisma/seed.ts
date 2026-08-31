import { PrismaClient, Role, JudgeStatus, Classroom, User, Problem, Assignment } from '@prisma/client';
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

// Initialize driver adapter
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
  console.log('🚀 Start seeding database with rich data for ALL 60 students across 3 classrooms...');

  const adminPasswordHash = await bcrypt.hash('giangvien123', 10);
  const studentPasswordHash = await bcrypt.hash('password123', 10);

  // 1. Clean up old data
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

  // Lecturer joins classrooms
  for (const cl of classrooms) {
    await prisma.classroomMember.create({
      data: {
        userId: lecturer.id,
        classroomId: cl.id,
      },
    });
  }

  // 4. Create 60 Students
  console.log('👥 Creating 60 students (20 per classroom)...');
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

  // 5. Create 8 Diverse Problems with Test Cases
  console.log('📝 Creating 8 problems with test cases...');
  
  const problemDefs = [
    {
      title: 'Tính tổng 2 số (A + B)',
      description: 'Cho hai số nguyên A và B từ đầu vào tiêu chuẩn. Hãy tính và in ra tổng của chúng.',
      testCases: [
        { input: '5 10', expectedOutput: '15', isHidden: false, score: 3.0 },
        { input: '-3 8', expectedOutput: '5', isHidden: false, score: 3.0 },
        { input: '1000000 2000000', expectedOutput: '3000000', isHidden: true, score: 4.0 },
      ],
    },
    {
      title: 'Kiểm tra số nguyên tố',
      description: 'Cho số nguyên dương N. Hãy kiểm tra xem N có phải là số nguyên tố hay không. In ra YES hoặc NO.',
      testCases: [
        { input: '7', expectedOutput: 'YES', isHidden: false, score: 3.0 },
        { input: '10', expectedOutput: 'NO', isHidden: false, score: 3.0 },
        { input: '7919', expectedOutput: 'YES', isHidden: true, score: 4.0 },
      ],
    },
    {
      title: 'Số Fibonacci thứ N',
      description: 'Tìm số Fibonacci thứ N (0 <= N <= 30). Biết F(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2).',
      testCases: [
        { input: '5', expectedOutput: '5', isHidden: false, score: 3.0 },
        { input: '10', expectedOutput: '55', isHidden: false, score: 3.0 },
        { input: '30', expectedOutput: '832040', isHidden: true, score: 4.0 },
      ],
    },
    {
      title: 'Kiểm tra chuỗi đối xứng (Palindrome)',
      description: 'Cho một chuỗi ký tự S. Kiểm tra xem S có đối xứng (palindrome) hay không. In ra YES hoặc NO.',
      testCases: [
        { input: 'radar', expectedOutput: 'YES', isHidden: false, score: 3.0 },
        { input: 'hello', expectedOutput: 'NO', isHidden: false, score: 3.0 },
        { input: 'redder', expectedOutput: 'YES', isHidden: true, score: 4.0 },
      ],
    },
    {
      title: 'Tìm phần tử lớn thứ hai trong mảng',
      description: 'Cho mảng N số nguyên. Hãy tìm và in ra giá trị lớn thứ hai trong mảng. Nếu không tồn tại, in ra -1.',
      testCases: [
        { input: '5\n1 2 3 4 5', expectedOutput: '4', isHidden: false, score: 3.0 },
        { input: '4\n10 10 10 10', expectedOutput: '-1', isHidden: false, score: 3.0 },
        { input: '6\n5 8 12 3 12 9', expectedOutput: '9', isHidden: true, score: 4.0 },
      ],
    },
    {
      title: 'Đảo ngược mảng số nguyên',
      description: 'Cho mảng gồm N số nguyên. Hãy in ra các phần tử của mảng theo thứ tự đảo ngược.',
      testCases: [
        { input: '4\n1 2 3 4', expectedOutput: '4 3 2 1', isHidden: false, score: 5.0 },
        { input: '5\n10 20 30 40 50', expectedOutput: '50 40 30 20 10', isHidden: true, score: 5.0 },
      ],
    },
    {
      title: 'Tính giai thừa N!',
      description: 'Cho số nguyên dương N (1 <= N <= 15). Hãy tính và in ra giá trị N! = 1 * 2 * ... * N.',
      testCases: [
        { input: '5', expectedOutput: '120', isHidden: false, score: 4.0 },
        { input: '7', expectedOutput: '5040', isHidden: false, score: 3.0 },
        { input: '12', expectedOutput: '479001600', isHidden: true, score: 3.0 },
      ],
    },
    {
      title: 'Đếm số lần xuất hiện của ký tự',
      description: 'Cho một chuỗi S và một ký tự C. Hãy đếm và in ra số lần ký tự C xuất hiện trong chuỗi S.',
      testCases: [
        { input: 'helloworld l', expectedOutput: '3', isHidden: false, score: 5.0 },
        { input: 'programming g', expectedOutput: '2', isHidden: true, score: 5.0 },
      ],
    },
  ];

  const problems: any[] = [];
  for (const def of problemDefs) {
    const p = await prisma.problem.create({
      data: {
        title: def.title,
        description: def.description,
        timeLimitMs: 1000,
        memoryLimitMb: 256,
        authorId: lecturer.id,
        testCases: {
          create: def.testCases,
        },
      },
      include: { testCases: true },
    });
    problems.push(p);
  }
  console.log('✅ 8 Problems created successfully.');

  // 6. Create Assignments for all classrooms (4-5 assignments per classroom)
  console.log('📅 Assigning 4-5 problems to each classroom...');
  const now = new Date();

  // Classroom 1 (64CNTT_VA): Assigned 5 problems (P0, P1, P2, P3, P4)
  const class1Assignments: any[] = [];
  for (let idx of [0, 1, 2, 3, 4]) {
    const a = await prisma.assignment.create({
      data: {
        classroomId: classrooms[0].id,
        problemId: problems[idx].id,
        startTime: new Date(now.getTime() - (7 - idx) * 24 * 60 * 60 * 1000),
        deadline: new Date(now.getTime() + (7 + idx) * 24 * 60 * 60 * 1000),
        isPublished: true,
      },
      include: { problem: { include: { testCases: true } } },
    });
    class1Assignments.push(a);
  }

  // Classroom 2 (64CNTT_CLC): Assigned 4 problems (P1, P2, P5, P6)
  const class2Assignments: any[] = [];
  for (let idx of [1, 2, 5, 6]) {
    const a = await prisma.assignment.create({
      data: {
        classroomId: classrooms[1].id,
        problemId: problems[idx].id,
        startTime: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
        deadline: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
        isPublished: true,
      },
      include: { problem: { include: { testCases: true } } },
    });
    class2Assignments.push(a);
  }

  // Classroom 3 (64CNTT_1): Assigned 4 problems (P0, P3, P6, P7)
  const class3Assignments: any[] = [];
  for (let idx of [0, 3, 6, 7]) {
    const a = await prisma.assignment.create({
      data: {
        classroomId: classrooms[2].id,
        problemId: problems[idx].id,
        startTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        deadline: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000),
        isPublished: true,
      },
      include: { problem: { include: { testCases: true } } },
    });
    class3Assignments.push(a);
  }

  console.log('✅ Assignments registered.');

  // 7. Seed Diverse Submissions for ALL 60 Students
  console.log('💻 Generating realistic submissions for ALL 60 students in 3 classrooms...');

  const classroomAssignmentsMap = [class1Assignments, class2Assignments, class3Assignments];

  for (let i = 0; i < 60; i++) {
    const student = students[i];
    const classIdx = Math.floor(i / 20); // 0, 1, or 2
    const classAssignments = classroomAssignmentsMap[classIdx];
    const studentRankInClass = (i % 20) + 1; // 1 to 20

    // Decide how many assignments this student submits (at least 2, up to all)
    let assignmentsToSubmitCount = 2;
    if (studentRankInClass <= 5) {
      assignmentsToSubmitCount = classAssignments.length; // Top 5 students submit all
    } else if (studentRankInClass <= 12) {
      assignmentsToSubmitCount = Math.min(classAssignments.length, 3 + (studentRankInClass % 2)); // 3-4 assignments
    } else if (studentRankInClass <= 17) {
      assignmentsToSubmitCount = 2 + (studentRankInClass % 2); // 2-3 assignments
    } else {
      assignmentsToSubmitCount = 2; // Bottom students submit 2
    }

    for (let aIdx = 0; aIdx < assignmentsToSubmitCount; aIdx++) {
      const assignment = classAssignments[aIdx];
      const problem = assignment.problem;

      // Determine score and status based on student rank tier
      let status: JudgeStatus = JudgeStatus.ACCEPTED;
      let score = 10.0;

      if (studentRankInClass <= 3) {
        // Excellent students: mostly 10.0
        score = 10.0;
        status = JudgeStatus.ACCEPTED;
      } else if (studentRankInClass <= 7) {
        // High tier: mostly 8.0 - 10.0
        if (aIdx === assignmentsToSubmitCount - 1 && studentRankInClass % 2 === 0) {
          score = 7.0;
          status = JudgeStatus.WRONG_ANSWER;
        } else {
          score = 10.0;
          status = JudgeStatus.ACCEPTED;
        }
      } else if (studentRankInClass <= 14) {
        // Mid tier: scores range from 5.0 to 10.0
        if (aIdx === 0) {
          score = 10.0;
          status = JudgeStatus.ACCEPTED;
        } else if (aIdx === 1) {
          score = 6.0 + (studentRankInClass % 3);
          status = JudgeStatus.WRONG_ANSWER;
        } else {
          score = 5.0;
          status = JudgeStatus.WRONG_ANSWER;
        }
      } else {
        // Low tier: scores range from 0.0 to 6.0
        if (studentRankInClass === 19 && aIdx === 0) {
          score = 0.0;
          status = JudgeStatus.COMPILATION_ERROR;
        } else if (studentRankInClass === 20 && aIdx === 0) {
          score = 0.0;
          status = JudgeStatus.RUNTIME_ERROR;
        } else {
          score = 3.0 + (studentRankInClass % 4);
          status = JudgeStatus.WRONG_ANSWER;
        }
      }

      // If mid tier, simulate a previous lower attempt to test max score logic
      if (studentRankInClass >= 4 && studentRankInClass <= 8 && aIdx === 0) {
        const firstAttemptSub = await prisma.submission.create({
          data: {
            userId: student.id,
            assignmentId: assignment.id,
            sourceCode: `// First attempt by ${student.fullName}\n// (Got partial score)`,
            language: 'cpp',
            status: JudgeStatus.WRONG_ANSWER,
            totalScore: Math.max(3.0, score - 4.0),
            executionTimeMs: Math.floor(Math.random() * 60) + 20,
            memoryUsedKb: 2048,
          },
        });

        for (const tc of problem.testCases) {
          await prisma.submissionDetail.create({
            data: {
              submissionId: firstAttemptSub.id,
              testCaseId: tc.id,
              status: JudgeStatus.WRONG_ANSWER,
              actualOutput: 'wrong_result',
              executionTimeMs: 15,
            },
          });
        }
      }

      // Create main/latest submission
      const sub = await prisma.submission.create({
        data: {
          userId: student.id,
          assignmentId: assignment.id,
          sourceCode: `// Final code submission by ${student.fullName}\n#include <iostream>\nusing namespace std;\nint main() {\n    return 0;\n}`,
          language: 'cpp',
          status: status,
          totalScore: score,
          executionTimeMs: Math.floor(Math.random() * 70) + 15,
          memoryUsedKb: 2048 + Math.floor(Math.random() * 2048),
        },
      });

      // Create detailed testcase results
      for (const tc of problem.testCases) {
        const isTcAccepted = status === JudgeStatus.ACCEPTED || (status === JudgeStatus.WRONG_ANSWER && !tc.isHidden);
        await prisma.submissionDetail.create({
          data: {
            submissionId: sub.id,
            testCaseId: tc.id,
            status: isTcAccepted ? JudgeStatus.ACCEPTED : JudgeStatus.WRONG_ANSWER,
            actualOutput: isTcAccepted ? tc.expectedOutput : 'unexpected_output',
            executionTimeMs: Math.floor(Math.random() * 25) + 5,
          },
        });
      }
    }
  }

  console.log('✅ All 60 students in 3 classrooms now have comprehensive submissions!');
  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding: ', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });