-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profileCompletedAt" TIMESTAMP(3),
ADD COLUMN     "profileRole" TEXT,
ADD COLUMN     "profileScale" TEXT,
ADD COLUMN     "profileUse" TEXT;
