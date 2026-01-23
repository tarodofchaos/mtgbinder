import { CardCondition } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { isConditionAcceptable } from '../utils/card-conditions';

interface TradeMatch {
  cardId: string;
  cardName: string;
  setCode: string;
  setName: string;
  scryfallId: string | null;
  offererUserId: string;
  receiverUserId: string;
  availableQuantity: number;
  condition: CardCondition;
  isFoil: boolean;
  priority: string;
  priceEur: number | null;
  tradePrice: number | null;
}

interface TradeMatchResult {
  userAOffers: TradeMatch[];
  userBOffers: TradeMatch[];
  userATotalValue: number;
  userBTotalValue: number;
}

export async function computeTradeMatches(
  userAId: string,
  userBId: string
): Promise<TradeMatchResult> {
  // Get what A has for trade and B wants
  const userAOffersRaw = await prisma.$queryRaw<
    Array<{
      cardId: string;
      cardName: string;
      setCode: string;
      setName: string;
      scryfallId: string | null;
      forTrade: number;
      foilQuantity: number;
      condition: CardCondition;
      priority: string;
      minCondition: CardCondition | null;
      foilOnly: boolean;
      priceEur: number | null;
      priceEurFoil: number | null;
      tradePrice: number | null;
    }>
  >`
    SELECT
      c.id as "cardId",
      c.name as "cardName",
      c."setCode",
      c."setName",
      c."scryfallId",
      ci."forTrade",
      ci."foilQuantity",
      ci.condition,
      ci."tradePrice",
      wi.priority,
      wi."minCondition",
      wi."foilOnly",
      c."priceEur",
      c."priceEurFoil"
    FROM collection_items ci
    JOIN cards c ON c.id = ci."cardId"
    JOIN wishlist_items wi ON c.id = wi."cardId"
    WHERE ci."userId" = ${userAId}::uuid
      AND wi."userId" = ${userBId}::uuid
      AND ci."forTrade" > 0
  `;

  // Get what B has for trade and A wants
  const userBOffersRaw = await prisma.$queryRaw<
    Array<{
      cardId: string;
      cardName: string;
      setCode: string;
      setName: string;
      scryfallId: string | null;
      forTrade: number;
      foilQuantity: number;
      condition: CardCondition;
      priority: string;
      minCondition: CardCondition | null;
      foilOnly: boolean;
      priceEur: number | null;
      priceEurFoil: number | null;
      tradePrice: number | null;
    }>
  >`
    SELECT
      c.id as "cardId",
      c.name as "cardName",
      c."setCode",
      c."setName",
      c."scryfallId",
      ci."forTrade",
      ci."foilQuantity",
      ci.condition,
      ci."tradePrice",
      wi.priority,
      wi."minCondition",
      wi."foilOnly",
      c."priceEur",
      c."priceEurFoil"
    FROM collection_items ci
    JOIN cards c ON c.id = ci."cardId"
    JOIN wishlist_items wi ON c.id = wi."cardId"
    WHERE ci."userId" = ${userBId}::uuid
      AND wi."userId" = ${userAId}::uuid
      AND ci."forTrade" > 0
  `;

  // Filter and transform matches based on conditions
  const userAOffers: TradeMatch[] = userAOffersRaw
    .filter((item) => {
      if (!isConditionAcceptable(item.condition, item.minCondition)) {
        return false;
      }
      if (item.foilOnly && item.foilQuantity === 0) {
        return false;
      }
      return true;
    })
    .map((item) => ({
      cardId: item.cardId,
      cardName: item.cardName,
      setCode: item.setCode,
      setName: item.setName,
      scryfallId: item.scryfallId,
      offererUserId: userAId,
      receiverUserId: userBId,
      availableQuantity: item.foilOnly ? Math.min(item.forTrade, item.foilQuantity) : item.forTrade,
      condition: item.condition,
      isFoil: item.foilOnly || item.foilQuantity > 0,
      priority: item.priority,
      priceEur: item.foilOnly ? item.priceEurFoil : item.priceEur,
      tradePrice: item.tradePrice,
    }));

  const userBOffers: TradeMatch[] = userBOffersRaw
    .filter((item) => {
      if (!isConditionAcceptable(item.condition, item.minCondition)) {
        return false;
      }
      if (item.foilOnly && item.foilQuantity === 0) {
        return false;
      }
      return true;
    })
    .map((item) => ({
      cardId: item.cardId,
      cardName: item.cardName,
      setCode: item.setCode,
      setName: item.setName,
      scryfallId: item.scryfallId,
      offererUserId: userBId,
      receiverUserId: userAId,
      availableQuantity: item.foilOnly ? Math.min(item.forTrade, item.foilQuantity) : item.forTrade,
      condition: item.condition,
      isFoil: item.foilOnly || item.foilQuantity > 0,
      priority: item.priority,
      priceEur: item.foilOnly ? item.priceEurFoil : item.priceEur,
      tradePrice: item.tradePrice,
    }));

  // Calculate total values
  const userATotalValue = userAOffers.reduce(
    (sum, match) => sum + (match.priceEur || 0) * match.availableQuantity,
    0
  );
  const userBTotalValue = userBOffers.reduce(
    (sum, match) => sum + (match.priceEur || 0) * match.availableQuantity,
    0
  );

  return {
    userAOffers,
    userBOffers,
    userATotalValue: Math.round(userATotalValue * 100) / 100,
    userBTotalValue: Math.round(userBTotalValue * 100) / 100,
  };
}
