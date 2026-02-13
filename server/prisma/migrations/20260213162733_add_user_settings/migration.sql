-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarId" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;
