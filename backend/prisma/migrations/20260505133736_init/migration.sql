/*
  Warnings:

  - The `emotions` column on the `Entry` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[userId,date]` on the table `Entry` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Entry` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `mood` on the `Entry` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "mood",
ADD COLUMN     "mood" INTEGER NOT NULL,
DROP COLUMN "emotions",
ADD COLUMN     "emotions" TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "refreshTokenHash" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Entry_userId_date_key" ON "Entry"("userId", "date");
