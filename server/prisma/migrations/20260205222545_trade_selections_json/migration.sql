/*
  Warnings:

  - You are about to drop the column `userASelectedIds` on the `trade_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `userBSelectedIds` on the `trade_sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "trade_sessions" DROP COLUMN "userASelectedIds",
DROP COLUMN "userBSelectedIds",
ADD COLUMN     "userASelectedJson" JSONB,
ADD COLUMN     "userBSelectedJson" JSONB;
