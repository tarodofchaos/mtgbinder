/*
  Warnings:

  - You are about to drop the column `tutorialSeen` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "tutorialSeen",
ADD COLUMN     "tutorialProgress" JSONB NOT NULL DEFAULT '{}';
