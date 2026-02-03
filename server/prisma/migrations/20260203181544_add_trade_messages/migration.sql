-- CreateTable
CREATE TABLE "trade_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trade_messages_sessionId_idx" ON "trade_messages"("sessionId");

-- CreateIndex
CREATE INDEX "trade_messages_senderId_idx" ON "trade_messages"("senderId");

-- CreateIndex
CREATE INDEX "trade_messages_createdAt_idx" ON "trade_messages"("createdAt");

-- AddForeignKey
ALTER TABLE "trade_messages" ADD CONSTRAINT "trade_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "trade_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_messages" ADD CONSTRAINT "trade_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
