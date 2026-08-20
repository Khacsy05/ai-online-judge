/*
  Warnings:

  - You are about to drop the column `description` on the `Classroom` table. All the data in the column will be lost.
  - You are about to drop the column `teacherId` on the `Classroom` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Classroom` table. All the data in the column will be lost.
  - You are about to drop the column `classroomId` on the `Problem` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `Problem` table. All the data in the column will be lost.
  - You are about to drop the column `problemId` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - Added the required column `authorId` to the `Problem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assignmentId` to the `Submission` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Classroom` DROP FOREIGN KEY `Classroom_teacherId_fkey`;

-- DropForeignKey
ALTER TABLE `Problem` DROP FOREIGN KEY `Problem_classroomId_fkey`;

-- DropForeignKey
ALTER TABLE `Problem` DROP FOREIGN KEY `Problem_createdById_fkey`;

-- DropForeignKey
ALTER TABLE `Submission` DROP FOREIGN KEY `Submission_problemId_fkey`;

-- DropIndex
DROP INDEX `Classroom_teacherId_fkey` ON `Classroom`;

-- DropIndex
DROP INDEX `Problem_classroomId_fkey` ON `Problem`;

-- DropIndex
DROP INDEX `Problem_createdById_fkey` ON `Problem`;

-- DropIndex
DROP INDEX `Submission_problemId_fkey` ON `Submission`;

-- AlterTable
ALTER TABLE `Classroom` DROP COLUMN `description`,
    DROP COLUMN `teacherId`,
    DROP COLUMN `updatedAt`;

-- AlterTable
ALTER TABLE `Problem` DROP COLUMN `classroomId`,
    DROP COLUMN `createdById`,
    ADD COLUMN `authorId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Submission` DROP COLUMN `problemId`,
    ADD COLUMN `assignmentId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `User` DROP COLUMN `updatedAt`;

-- CreateTable
CREATE TABLE `Assignment` (
    `id` VARCHAR(191) NOT NULL,
    `classroomId` VARCHAR(191) NOT NULL,
    `problemId` VARCHAR(191) NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `deadline` DATETIME(3) NOT NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Assignment_classroomId_problemId_key`(`classroomId`, `problemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Problem` ADD CONSTRAINT `Problem_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_classroomId_fkey` FOREIGN KEY (`classroomId`) REFERENCES `Classroom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assignment` ADD CONSTRAINT `Assignment_problemId_fkey` FOREIGN KEY (`problemId`) REFERENCES `Problem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Submission` ADD CONSTRAINT `Submission_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `Assignment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
