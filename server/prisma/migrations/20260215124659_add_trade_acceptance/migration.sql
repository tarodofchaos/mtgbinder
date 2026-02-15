-- AlterTable
ALTER TABLE "trade_sessions" ADD COLUMN     "userAAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "userBAccepted" BOOLEAN NOT NULL DEFAULT false;
