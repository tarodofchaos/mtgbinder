-- AlterTable
ALTER TABLE "cards" ADD COLUMN     "nameEs" TEXT;

-- CreateIndex
CREATE INDEX "cards_nameEs_idx" ON "cards"("nameEs");
