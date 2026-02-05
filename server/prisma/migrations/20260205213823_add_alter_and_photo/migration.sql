/*
  Warnings:

  - A unique constraint covering the columns `[userId,cardId,condition,language,isAlter]` on the table `collection_items` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "collection_items_userId_cardId_condition_language_key";

-- AlterTable
ALTER TABLE "collection_items" ADD COLUMN     "isAlter" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "photoUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "collection_items_userId_cardId_condition_language_isAlter_key" ON "collection_items"("userId", "cardId", "condition", "language", "isAlter");
