-- AlterTable
ALTER TABLE "trade_sessions" ADD COLUMN     "userASelectedIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "userBSelectedIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
