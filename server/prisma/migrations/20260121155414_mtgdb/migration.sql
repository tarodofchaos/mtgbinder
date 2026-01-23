-- CreateEnum
CREATE TYPE "CardCondition" AS ENUM ('M', 'NM', 'LP', 'MP', 'HP', 'DMG');

-- CreateEnum
CREATE TYPE "WishlistPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TradeSessionStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'EXPIRED');

-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "setCode" TEXT NOT NULL,
    "setName" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "manaCost" TEXT,
    "manaValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "typeLine" TEXT NOT NULL,
    "oracleText" TEXT,
    "scryfallId" TEXT,
    "collectorNumber" TEXT NOT NULL,
    "priceEur" DOUBLE PRECISION,
    "priceEurFoil" DOUBLE PRECISION,
    "priceUsd" DOUBLE PRECISION,
    "priceUsdFoil" DOUBLE PRECISION,
    "imageUri" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "shareCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "foilQuantity" INTEGER NOT NULL DEFAULT 0,
    "condition" "CardCondition" NOT NULL DEFAULT 'NM',
    "language" TEXT NOT NULL DEFAULT 'EN',
    "forTrade" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priority" "WishlistPriority" NOT NULL DEFAULT 'NORMAL',
    "maxPrice" DOUBLE PRECISION,
    "minCondition" "CardCondition",
    "foilOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_sessions" (
    "id" TEXT NOT NULL,
    "sessionCode" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "joinerId" TEXT,
    "status" "TradeSessionStatus" NOT NULL DEFAULT 'PENDING',
    "matchesJson" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cards_uuid_key" ON "cards"("uuid");

-- CreateIndex
CREATE INDEX "cards_name_idx" ON "cards"("name");

-- CreateIndex
CREATE INDEX "cards_setCode_idx" ON "cards"("setCode");

-- CreateIndex
CREATE INDEX "cards_scryfallId_idx" ON "cards"("scryfallId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_shareCode_key" ON "users"("shareCode");

-- CreateIndex
CREATE INDEX "collection_items_userId_idx" ON "collection_items"("userId");

-- CreateIndex
CREATE INDEX "collection_items_cardId_idx" ON "collection_items"("cardId");

-- CreateIndex
CREATE INDEX "collection_items_forTrade_idx" ON "collection_items"("forTrade");

-- CreateIndex
CREATE UNIQUE INDEX "collection_items_userId_cardId_condition_language_key" ON "collection_items"("userId", "cardId", "condition", "language");

-- CreateIndex
CREATE INDEX "wishlist_items_userId_idx" ON "wishlist_items"("userId");

-- CreateIndex
CREATE INDEX "wishlist_items_cardId_idx" ON "wishlist_items"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_userId_cardId_key" ON "wishlist_items"("userId", "cardId");

-- CreateIndex
CREATE UNIQUE INDEX "trade_sessions_sessionCode_key" ON "trade_sessions"("sessionCode");

-- CreateIndex
CREATE INDEX "trade_sessions_sessionCode_idx" ON "trade_sessions"("sessionCode");

-- CreateIndex
CREATE INDEX "trade_sessions_initiatorId_idx" ON "trade_sessions"("initiatorId");

-- CreateIndex
CREATE INDEX "trade_sessions_joinerId_idx" ON "trade_sessions"("joinerId");

-- CreateIndex
CREATE INDEX "trade_sessions_status_idx" ON "trade_sessions"("status");

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_sessions" ADD CONSTRAINT "trade_sessions_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_sessions" ADD CONSTRAINT "trade_sessions_joinerId_fkey" FOREIGN KEY ("joinerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
