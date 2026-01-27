import { CardCondition } from '@prisma/client';

// Create mock for $queryRaw
const mockQueryRaw = jest.fn();

// Mock prisma module
jest.mock('../utils/prisma', () => ({
  prisma: {
    $queryRaw: mockQueryRaw,
  },
}));

// Import after mocking
import { computeTradeMatches } from './match-service';

describe('Match Service - Trade Matching Algorithm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create mock tradeable card data
  const createTradeableCard = (overrides: Partial<{
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
    priceEur: number | null;
    priceEurFoil: number | null;
    tradePrice: number | null;
  }> = {}) => ({
    cardId: 'card-1',
    cardName: 'Lightning Bolt',
    setCode: 'M21',
    setName: 'Core Set 2021',
    scryfallId: 'scry-123',
    rarity: 'common',
    manaCost: '{R}',
    manaValue: 1,
    typeLine: 'Instant',
    oracleText: 'Lightning Bolt deals 3 damage to any target.',
    collectorNumber: '199',
    imageUri: 'https://example.com/image.jpg',
    priceUsd: 1.5,
    priceUsdFoil: 5.0,
    forTrade: 2,
    foilQuantity: 0,
    condition: CardCondition.NM,
    priceEur: 1.2,
    priceEurFoil: 4.0,
    tradePrice: null,
    ...overrides,
  });

  describe('Basic Trade Matching', () => {
    it('should return empty arrays when neither user has tradeable cards', async () => {
      // User A's tradeable cards (empty)
      mockQueryRaw.mockResolvedValueOnce([]);
      // User B's tradeable cards (empty)
      mockQueryRaw.mockResolvedValueOnce([]);
      // User B's wishlist (empty)
      mockQueryRaw.mockResolvedValueOnce([]);
      // User A's wishlist (empty)
      mockQueryRaw.mockResolvedValueOnce([]);

      const result = await computeTradeMatches('user-a-id', 'user-b-id');

      expect(result.userAOffers).toEqual([]);
      expect(result.userBOffers).toEqual([]);
      expect(result.userATotalValue).toBe(0);
      expect(result.userBTotalValue).toBe(0);
    });

    it('should mark cards as matches when card NAME is on other users wishlist', async () => {
      const userACard = createTradeableCard({
        cardId: 'bolt-m21',
        cardName: 'Lightning Bolt',
        setCode: 'M21',
      });

      // User A's tradeable cards
      mockQueryRaw.mockResolvedValueOnce([userACard]);
      // User B's tradeable cards (empty)
      mockQueryRaw.mockResolvedValueOnce([]);
      // User B's wishlist - wants Lightning Bolt (any printing)
      mockQueryRaw.mockResolvedValueOnce([{ cardName: 'Lightning Bolt' }]);
      // User A's wishlist (empty)
      mockQueryRaw.mockResolvedValueOnce([]);

      const result = await computeTradeMatches('user-a-id', 'user-b-id');

      expect(result.userAOffers).toHaveLength(1);
      expect(result.userAOffers[0].isMatch).toBe(true);
      expect(result.userAOffers[0].cardName).toBe('Lightning Bolt');
    });

    it('should NOT mark cards as matches when card is NOT on wishlist', async () => {
      const userACard = createTradeableCard({
        cardId: 'bolt-m21',
        cardName: 'Lightning Bolt',
      });

      // User A's tradeable cards
      mockQueryRaw.mockResolvedValueOnce([userACard]);
      // User B's tradeable cards (empty)
      mockQueryRaw.mockResolvedValueOnce([]);
      // User B's wishlist - wants different card
      mockQueryRaw.mockResolvedValueOnce([{ cardName: 'Counterspell' }]);
      // User A's wishlist (empty)
      mockQueryRaw.mockResolvedValueOnce([]);

      const result = await computeTradeMatches('user-a-id', 'user-b-id');

      expect(result.userAOffers).toHaveLength(1);
      expect(result.userAOffers[0].isMatch).toBe(false);
    });

    it('should match by card NAME regardless of set/printing', async () => {
      // User A has Lightning Bolt from M21
      const userACard = createTradeableCard({
        cardId: 'bolt-m21',
        cardName: 'Lightning Bolt',
        setCode: 'M21',
        setName: 'Core Set 2021',
      });

      // User A's tradeable cards
      mockQueryRaw.mockResolvedValueOnce([userACard]);
      // User B's tradeable cards (empty)
      mockQueryRaw.mockResolvedValueOnce([]);
      // User B's wishlist - wants Lightning Bolt (from a different set originally)
      // But matching is by NAME only per ADR-005
      mockQueryRaw.mockResolvedValueOnce([{ cardName: 'Lightning Bolt' }]);
      // User A's wishlist (empty)
      mockQueryRaw.mockResolvedValueOnce([]);

      const result = await computeTradeMatches('user-a-id', 'user-b-id');

      expect(result.userAOffers[0].isMatch).toBe(true);
      // The match should still contain the specific set info
      expect(result.userAOffers[0].setCode).toBe('M21');
    });
  });

  describe('Case-Insensitive Matching', () => {
    it('should match card names case-insensitively', async () => {
      const userACard = createTradeableCard({
        cardName: 'Lightning Bolt', // Mixed case
      });

      // User A's tradeable cards
      mockQueryRaw.mockResolvedValueOnce([userACard]);
      // User B's tradeable cards (empty)
      mockQueryRaw.mockResolvedValueOnce([]);
      // User B's wishlist - lowercase version
      mockQueryRaw.mockResolvedValueOnce([{ cardName: 'lightning bolt' }]);
      // User A's wishlist (empty)
      mockQueryRaw.mockResolvedValueOnce([]);

      const result = await computeTradeMatches('user-a-id', 'user-b-id');

      expect(result.userAOffers[0].isMatch).toBe(true);
    });

    it('should handle all uppercase wishlist entries', async () => {
      const userACard = createTradeableCard({
        cardName: 'Sol Ring',
      });

      mockQueryRaw.mockResolvedValueOnce([userACard]);
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([{ cardName: 'SOL RING' }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const result = await computeTradeMatches('user-a-id', 'user-b-id');

      expect(result.userAOffers[0].isMatch).toBe(true);
    });
  });

  describe('Bidirectional Matching', () => {
    it('should compute matches for both users simultaneously', async () => {
      const userACard = createTradeableCard({
        cardId: 'bolt-1',
        cardName: 'Lightning Bolt',
        priceEur: 1.0,
      });
      const userBCard = createTradeableCard({
        cardId: 'ring-1',
        cardName: 'Sol Ring',
        priceEur: 2.0,
      });

      // User A offers Lightning Bolt
      mockQueryRaw.mockResolvedValueOnce([userACard]);
      // User B offers Sol Ring
      mockQueryRaw.mockResolvedValueOnce([userBCard]);
      // User B wants Lightning Bolt
      mockQueryRaw.mockResolvedValueOnce([{ cardName: 'Lightning Bolt' }]);
      // User A wants Sol Ring
      mockQueryRaw.mockResolvedValueOnce([{ cardName: 'Sol Ring' }]);

      const result = await computeTradeMatches('user-a-id', 'user-b-id');

      // User A's Lightning Bolt matches User B's wishlist
      expect(result.userAOffers[0].isMatch).toBe(true);
      expect(result.userAOffers[0].cardName).toBe('Lightning Bolt');

      // User B's Sol Ring matches User A's wishlist
      expect(result.userBOffers[0].isMatch).toBe(true);
      expect(result.userBOffers[0].cardName).toBe('Sol Ring');
    });

    it('should set correct offerer and receiver user IDs', async () => {
      const userACard = createTradeableCard({ cardName: 'Card A' });
      const userBCard = createTradeableCard({ cardName: 'Card B' });

      mockQueryRaw.mockResolvedValueOnce([userACard]);
      mockQueryRaw.mockResolvedValueOnce([userBCard]);
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const result = await computeTradeMatches('user-a-id', 'user-b-id');

      // User A's offers should show A as offerer, B as receiver
      expect(result.userAOffers[0].offererUserId).toBe('user-a-id');
      expect(result.userAOffers[0].receiverUserId).toBe('user-b-id');

      // User B's offers should show B as offerer, A as receiver
      expect(result.userBOffers[0].offererUserId).toBe('user-b-id');
      expect(result.userBOffers[0].receiverUserId).toBe('user-a-id');
    });
  });

  describe('Sorting Behavior', () => {
    it('should sort matches before non-matches', async () => {
      const cardA = createTradeableCard({ cardId: '1', cardName: 'Alpha Card' });
      const cardB = createTradeableCard({ cardId: '2', cardName: 'Beta Card' });
      const cardC = createTradeableCard({ cardId: '3', cardName: 'Gamma Card' });

      // User A offers all three cards
      mockQueryRaw.mockResolvedValueOnce([cardA, cardB, cardC]);
      mockQueryRaw.mockResolvedValueOnce([]);
      // User B only wants Gamma Card (should be first despite alphabetical order)
      mockQueryRaw.mockResolvedValueOnce([{ cardName: 'Gamma Card' }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const result = await computeTradeMatches('user-a-id', 'user-b-id');

      // Gamma Card (match) should come first
      expect(result.userAOffers[0].cardName).toBe('Gamma Card');
      expect(result.userAOffers[0].isMatch).toBe(true);

      // Then Alpha and Beta (non-matches, alphabetically sorted)
      expect(result.userAOffers[1].cardName).toBe('Alpha Card');
      expect(result.userAOffers[1].isMatch).toBe(false);
      expect(result.userAOffers[2].cardName).toBe('Beta Card');
      expect(result.userAOffers[2].isMatch).toBe(false);
    });

    it('should sort matches alphabetically among themselves', async () => {
      const cardA = createTradeableCard({ cardId: '1', cardName: 'Zebra Card' });
      const cardB = createTradeableCard({ cardId: '2', cardName: 'Alpha Card' });
      const cardC = createTradeableCard({ cardId: '3', cardName: 'Middle Card' });

      mockQueryRaw.mockResolvedValueOnce([cardA, cardB, cardC]);
      mockQueryRaw.mockResolvedValueOnce([]);
      // All cards are wanted
      mockQueryRaw.mockResolvedValueOnce([
        { cardName: 'Zebra Card' },
        { cardName: 'Alpha Card' },
        { cardName: 'Middle Card' },
      ]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const result = await computeTradeMatches('user-a-id', 'user-b-id');

      expect(result.userAOffers[0].cardName).toBe('Alpha Card');
      expect(result.userAOffers[1].cardName).toBe('Middle Card');
      expect(result.userAOffers[2].cardName).toBe('Zebra Card');
    });
  });

  describe('Value Calculation', () => {
    it('should calculate total value using EUR prices for matched cards only', async () => {
      const matchedCard = createTradeableCard({
        cardName: 'Expensive Match',
        priceEur: 10.0,
        forTrade: 2, // 2 available = 20 EUR total
      });
      const unmatchedCard = createTradeableCard({
        cardName: 'Expensive Non-Match',
        priceEur: 100.0,
        forTrade: 3, // Should NOT count
      });

      mockQueryRaw.mockResolvedValueOnce([matchedCard, unmatchedCard]);
      mockQueryRaw.mockResolvedValueOnce([]);
      // Only "Expensive Match" is wanted
      mockQueryRaw.mockResolvedValueOnce([{ cardName: 'Expensive Match' }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const result = await computeTradeMatches('user-a-id', 'user-b-id');

      // Only matched cards count: 10.0 * 2 = 20.00
      expect(result.userATotalValue).toBe(20.0);
    });

    it('should handle cards with null EUR prices', async () => {
      const cardWithPrice = createTradeableCard({
        cardName: 'Priced Card',
        priceEur: 5.0,
        forTrade: 1,
      });
      const cardWithoutPrice = createTradeableCard({
        cardName: 'Unpriced Card',
        priceEur: null,
        forTrade: 1,
      });

      mockQueryRaw.mockResolvedValueOnce([cardWithPrice, cardWithoutPrice]);
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([
        { cardName: 'Priced Card' },
        { cardName: 'Unpriced Card' },
      ]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const result = await computeTradeMatches('user-a-id', 'user-b-id');

      // 5.0 + 0 (null treated as 0) = 5.0
      expect(result.userATotalValue).toBe(5.0);
    });

    it('should round total values to 2 decimal places', async () => {
      const card = createTradeableCard({
        cardName: 'Weird Price',
        priceEur: 3.333, // 3.333 * 3 = 9.999
        forTrade: 3,
      });

      mockQueryRaw.mockResolvedValueOnce([card]);
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([{ cardName: 'Weird Price' }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const result = await computeTradeMatches('user-a-id', 'user-b-id');

      // Should round 9.999 to 10.0
      expect(result.userATotalValue).toBe(10);
    });

    it('should multiply price by available quantity', async () => {
      const card = createTradeableCard({
        cardName: 'Bulk Card',
        priceEur: 0.25,
        forTrade: 8,
      });

      mockQueryRaw.mockResolvedValueOnce([card]);
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([{ cardName: 'Bulk Card' }]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const result = await computeTradeMatches('user-a-id', 'user-b-id');

      // 0.25 * 8 = 2.0
      expect(result.userATotalValue).toBe(2.0);
    });
  });

  describe('Foil Detection', () => {
    it('should mark cards as foil when foilQuantity > 0', async () => {
      const foilCard = createTradeableCard({
        cardName: 'Shiny Card',
        foilQuantity: 2,
      });

      mockQueryRaw.mockResolvedValueOnce([foilCard]);
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const result = await computeTradeMatches('user-a-id', 'user-b-id');

      expect(result.userAOffers[0].isFoil).toBe(true);
    });

    it('should not mark cards as foil when foilQuantity is 0', async () => {
      const nonFoilCard = createTradeableCard({
        cardName: 'Normal Card',
        foilQuantity: 0,
      });

      mockQueryRaw.mockResolvedValueOnce([nonFoilCard]);
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const result = await computeTradeMatches('user-a-id', 'user-b-id');

      expect(result.userAOffers[0].isFoil).toBe(false);
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all card metadata in the response', async () => {
      const fullCard = createTradeableCard({
        cardId: 'full-card-id',
        cardName: 'Complete Card',
        setCode: 'SET',
        setName: 'Test Set',
        scryfallId: 'scry-full',
        rarity: 'rare',
        manaCost: '{2}{U}{U}',
        manaValue: 4,
        typeLine: 'Creature - Test',
        oracleText: 'This is a test card.',
        collectorNumber: '123',
        imageUri: 'https://example.com/card.jpg',
        priceUsd: 5.0,
        priceUsdFoil: 10.0,
        forTrade: 3,
        foilQuantity: 1,
        condition: CardCondition.LP,
        priceEur: 4.5,
        priceEurFoil: 9.0,
        tradePrice: 4.0,
      });

      mockQueryRaw.mockResolvedValueOnce([fullCard]);
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const result = await computeTradeMatches('user-a-id', 'user-b-id');
      const offer = result.userAOffers[0];

      expect(offer.cardId).toBe('full-card-id');
      expect(offer.cardName).toBe('Complete Card');
      expect(offer.setCode).toBe('SET');
      expect(offer.setName).toBe('Test Set');
      expect(offer.scryfallId).toBe('scry-full');
      expect(offer.rarity).toBe('rare');
      expect(offer.manaCost).toBe('{2}{U}{U}');
      expect(offer.manaValue).toBe(4);
      expect(offer.typeLine).toBe('Creature - Test');
      expect(offer.oracleText).toBe('This is a test card.');
      expect(offer.collectorNumber).toBe('123');
      expect(offer.imageUri).toBe('https://example.com/card.jpg');
      expect(offer.priceUsd).toBe(5.0);
      expect(offer.priceUsdFoil).toBe(10.0);
      expect(offer.availableQuantity).toBe(3);
      expect(offer.condition).toBe(CardCondition.LP);
      expect(offer.isFoil).toBe(true);
      expect(offer.priceEur).toBe(4.5);
      expect(offer.tradePrice).toBe(4.0);
    });

    it('should set priority to null (not used in current implementation)', async () => {
      const card = createTradeableCard({ cardName: 'Test' });

      mockQueryRaw.mockResolvedValueOnce([card]);
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([]);
      mockQueryRaw.mockResolvedValueOnce([]);

      const result = await computeTradeMatches('user-a-id', 'user-b-id');

      expect(result.userAOffers[0].priority).toBeNull();
    });
  });
});
