import { CardCondition } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { tradeMatchesTotal } from '../utils/metrics';

interface TradeMatch {
  collectionItemId: string;
  cardId: string;
  cardName: string;
  setCode: string;
  setName: string;
  scryfallId: string | null;
  rarity: string;
  manaCost: string | null;
  manaValue: number;
  typeLine: string;
  oracleText: string | null;
  collectorNumber: string;
  imageUri: string | null;
  priceUsd: number | null;
  priceUsdFoil: number | null;
  offererUserId: string;
  receiverUserId: string;
  availableQuantity: number;
  condition: CardCondition;
  language: string;
  isAlter: boolean;
  photoUrl: string | null;
  isFoil: boolean;
  priority: string | null;
  priceEur: number | null;
  tradePrice: number | null;
  isMatch: boolean;
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
  // Increment Prometheus counter
  tradeMatchesTotal.inc();

  // Get ALL cards User A has for trade
  const userATradeableRaw = await prisma.$queryRaw<
    Array<{
      collectionItemId: string;
      cardId: string;
      cardName: string;
      setCode: string;
      setName: string;
      scryfallId: string | null;
      rarity: string;
      manaCost: string | null;
      manaValue: number;
      typeLine: string;
      oracleText: string | null;
      collectorNumber: string;
      imageUri: string | null;
      priceUsd: number | null;
      priceUsdFoil: number | null;
      forTrade: number;
      foilQuantity: number;
      condition: CardCondition;
      language: string;
      isAlter: boolean;
      photoUrl: string | null;
      priceEur: number | null;
      priceEurFoil: number | null;
      tradePrice: number | null;
    }>
  >`
    SELECT
      ci.id as "collectionItemId",
      c.id as "cardId",
      c.name as "cardName",
      c."setCode",
      c."setName",
      c."scryfallId",
      c.rarity,
      c."manaCost",
      c."manaValue",
      c."typeLine",
      c."oracleText",
      c."collectorNumber",
      c."imageUri",
      c."priceUsd",
      c."priceUsdFoil",
      ci."forTrade",
      ci."foilQuantity",
      ci.condition,
      ci.language,
      ci."isAlter",
      ci."photoUrl",
      ci."tradePrice",
      c."priceEur",
      c."priceEurFoil"
    FROM collection_items ci
    JOIN cards c ON c.id = ci."cardId"
    WHERE ci."userId"::text = ${userAId}
      AND ci."forTrade" > 0
  `;

  // Get ALL cards User B has for trade
  const userBTradeableRaw = await prisma.$queryRaw<
    Array<{
      collectionItemId: string;
      cardId: string;
      cardName: string;
      setCode: string;
      setName: string;
      scryfallId: string | null;
      rarity: string;
      manaCost: string | null;
      manaValue: number;
      typeLine: string;
      oracleText: string | null;
      collectorNumber: string;
      imageUri: string | null;
      priceUsd: number | null;
      priceUsdFoil: number | null;
      forTrade: number;
      foilQuantity: number;
      condition: CardCondition;
      language: string;
      isAlter: boolean;
      photoUrl: string | null;
      priceEur: number | null;
      priceEurFoil: number | null;
      tradePrice: number | null;
    }>
  >`
    SELECT
      ci.id as "collectionItemId",
      c.id as "cardId",
      c.name as "cardName",
      c."setCode",
      c."setName",
      c."scryfallId",
      c.rarity,
      c."manaCost",
      c."manaValue",
      c."typeLine",
      c."oracleText",
      c."collectorNumber",
      c."imageUri",
      c."priceUsd",
      c."priceUsdFoil",
      ci."forTrade",
      ci."foilQuantity",
      ci.condition,
      ci.language,
      ci."isAlter",
      ci."photoUrl",
      ci."tradePrice",
      c."priceEur",
      c."priceEurFoil"
    FROM collection_items ci
    JOIN cards c ON c.id = ci."cardId"
    WHERE ci."userId"::text = ${userBId}
      AND ci."forTrade" > 0
  `;

  // Get User B's wishlist card NAMES (for matching against User A's offers)
  const userBWishlistNames = await prisma.$queryRaw<Array<{ cardName: string }>>`
    SELECT DISTINCT c.name as "cardName"
    FROM wishlist_items wi
    JOIN cards c ON c.id = wi."cardId"
    WHERE wi."userId"::text = ${userBId}
  `;
  const userBWantsNames = new Set(userBWishlistNames.map((w) => w.cardName.toLowerCase()));

  // Get User A's wishlist card NAMES (for matching against User B's offers)
  const userAWishlistNames = await prisma.$queryRaw<Array<{ cardName: string }>>`
    SELECT DISTINCT c.name as "cardName"
    FROM wishlist_items wi
    JOIN cards c ON c.id = wi."cardId"
    WHERE wi."userId"::text = ${userAId}
  `;
  const userAWantsNames = new Set(userAWishlistNames.map((w) => w.cardName.toLowerCase()));

  // Transform User A's tradeable cards, marking matches by NAME
  const userAOffers: TradeMatch[] = userATradeableRaw.map((item: any) => {
    const isMatch = userBWantsNames.has((item.cardName || item.cardname || '').toLowerCase());
    return {
      collectionItemId: item.collectionItemId || item.collectionitemid,
      cardId: item.cardId || item.cardid,
      cardName: item.cardName || item.cardname,
      setCode: item.setCode || item.setcode,
      setName: item.setName || item.setname,
      scryfallId: item.scryfallId || item.scryfallid,
      rarity: item.rarity,
      manaCost: item.manaCost || item.manacost,
      manaValue: item.manaValue || item.manavalue,
      typeLine: item.typeLine || item.typeline,
      oracleText: item.oracleText || item.oracletext,
      collectorNumber: item.collectorNumber || item.collectornumber,
      imageUri: item.imageUri || item.imageuri,
      priceUsd: item.priceUsd || item.priceusd,
      priceUsdFoil: item.priceUsdFoil || item.priceusdfoil,
      offererUserId: userAId,
      receiverUserId: userBId,
      availableQuantity: item.forTrade || item.fortrade,
      condition: item.condition,
      language: item.language,
      isAlter: item.isAlter || item.isalter,
      photoUrl: item.photoUrl || item.photourl,
      isFoil: (item.foilQuantity || item.foilquantity || 0) > 0,
      priority: null,
      priceEur: item.priceEur || item.priceeur,
      tradePrice: item.tradePrice || item.tradeprice,
      isMatch,
    };
  });

  // Transform User B's tradeable cards, marking matches by NAME
  const userBOffers: TradeMatch[] = userBTradeableRaw.map((item: any) => {
    const isMatch = userAWantsNames.has((item.cardName || item.cardname || '').toLowerCase());
    return {
      collectionItemId: item.collectionItemId || item.collectionitemid,
      cardId: item.cardId || item.cardid,
      cardName: item.cardName || item.cardname,
      setCode: item.setCode || item.setcode,
      setName: item.setName || item.setname,
      scryfallId: item.scryfallId || item.scryfallid,
      rarity: item.rarity,
      manaCost: item.manaCost || item.manacost,
      manaValue: item.manaValue || item.manavalue,
      typeLine: item.typeLine || item.typeline,
      oracleText: item.oracleText || item.oracletext,
      collectorNumber: item.collectorNumber || item.collectornumber,
      imageUri: item.imageUri || item.imageuri,
      priceUsd: item.priceUsd || item.priceusd,
      priceUsdFoil: item.priceUsdFoil || item.priceusdfoil,
      offererUserId: userBId,
      receiverUserId: userAId,
      availableQuantity: item.forTrade || item.fortrade,
      condition: item.condition,
      language: item.language,
      isAlter: item.isAlter || item.isalter,
      photoUrl: item.photoUrl || item.photourl,
      isFoil: (item.foilQuantity || item.foilquantity || 0) > 0,
      priority: null,
      priceEur: item.priceEur || item.priceeur,
      tradePrice: item.tradePrice || item.tradeprice,
      isMatch,
    };
  });

  // Sort both arrays: matches first, then by card name
  const sortByMatchThenName = (a: TradeMatch, b: TradeMatch) => {
    if (a.isMatch !== b.isMatch) {
      return a.isMatch ? -1 : 1;
    }
    return a.cardName.localeCompare(b.cardName);
  };

  userAOffers.sort(sortByMatchThenName);
  userBOffers.sort(sortByMatchThenName);

  // Calculate total values (only for matched cards)
  const userATotalValue = userAOffers
    .filter((match) => match.isMatch)
    .reduce((sum, match) => sum + (match.priceEur || 0) * match.availableQuantity, 0);
  const userBTotalValue = userBOffers
    .filter((match) => match.isMatch)
    .reduce((sum, match) => sum + (match.priceEur || 0) * match.availableQuantity, 0);

  return {
    userAOffers,
    userBOffers,
    userATotalValue: Math.round(userATotalValue * 100) / 100,
    userBTotalValue: Math.round(userBTotalValue * 100) / 100,
  };
}
