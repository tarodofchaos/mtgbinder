/*
  Warnings:

  - You are about to drop the column `name_tsvector` on the `cards` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "cards_name_tsvector_idx";

-- AlterTable
ALTER TABLE "cards" DROP COLUMN "name_tsvector";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bannerTheme" TEXT DEFAULT 'default';
