import { checkWishlistPrices } from './price-check-service';
import { prisma } from '../utils/prisma';
import * as socketService from './socket-service';

// Mock Prisma
jest.mock('../utils/prisma', () => ({
  prisma: {
    wishlistItem: {
      findMany: jest.fn(),
    },
    priceAlert: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock socket service
jest.mock('./socket-service', () => ({
  emitToUser: jest.fn(),
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('checkWishlistPrices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create alert when card price drops below maxPrice', async () => {
    const mockWishlistItem = {
      userId: 'user-1',
      cardId: 'card-1',
      maxPrice: 10.0,
      foilOnly: false,
      card: {
        id: 'card-1',
        name: 'Lightning Bolt',
        priceEur: 8.0,
        priceEurFoil: null,
      },
    };

    const mockCreatedAlert = {
      id: 'alert-1',
      userId: 'user-1',
      cardId: 'card-1',
      oldPrice: 10.0,
      newPrice: 8.0,
      read: false,
      createdAt: new Date(),
      card: mockWishlistItem.card,
    };

    // Setup mocks
    (prisma.wishlistItem.findMany as jest.Mock).mockResolvedValue([mockWishlistItem]);
    (prisma.priceAlert.findFirst as jest.Mock).mockResolvedValue(null); // No existing alert
    (prisma.priceAlert.create as jest.Mock).mockResolvedValue(mockCreatedAlert);

    // Run price check
    const alertsCreated = await checkWishlistPrices();

    // Verify alert was created
    expect(alertsCreated).toBe(1);
    expect(prisma.priceAlert.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        cardId: 'card-1',
        oldPrice: 10.0,
        newPrice: 8.0,
      },
      include: {
        card: true,
      },
    });

    // Verify socket event was emitted
    expect(socketService.emitToUser).toHaveBeenCalledWith(
      'user-1',
      'price-alert',
      expect.objectContaining({
        cardName: 'Lightning Bolt',
        oldPrice: 10.0,
        newPrice: 8.0,
      })
    );
  });

  it('should not create alert when price is above maxPrice', async () => {
    const mockWishlistItem = {
      userId: 'user-1',
      cardId: 'card-1',
      maxPrice: 10.0,
      foilOnly: false,
      card: {
        id: 'card-1',
        name: 'Black Lotus',
        priceEur: 15.0, // Price is above maxPrice
        priceEurFoil: null,
      },
    };

    (prisma.wishlistItem.findMany as jest.Mock).mockResolvedValue([mockWishlistItem]);

    const alertsCreated = await checkWishlistPrices();

    expect(alertsCreated).toBe(0);
    expect(prisma.priceAlert.create).not.toHaveBeenCalled();
  });

  it('should not create duplicate alert within 24 hours', async () => {
    const mockWishlistItem = {
      userId: 'user-1',
      cardId: 'card-1',
      maxPrice: 10.0,
      foilOnly: false,
      card: {
        id: 'card-1',
        name: 'Lightning Bolt',
        priceEur: 8.0,
        priceEurFoil: null,
      },
    };

    const existingAlert = {
      id: 'alert-1',
      userId: 'user-1',
      cardId: 'card-1',
      createdAt: new Date(), // Recent alert
    };

    (prisma.wishlistItem.findMany as jest.Mock).mockResolvedValue([mockWishlistItem]);
    (prisma.priceAlert.findFirst as jest.Mock).mockResolvedValue(existingAlert);

    const alertsCreated = await checkWishlistPrices();

    expect(alertsCreated).toBe(0);
    expect(prisma.priceAlert.create).not.toHaveBeenCalled();
  });

  it('should check foil price when foilOnly is true', async () => {
    const mockWishlistItem = {
      userId: 'user-1',
      cardId: 'card-1',
      maxPrice: 20.0,
      foilOnly: true, // Check foil price
      card: {
        id: 'card-1',
        name: 'Foil Lightning Bolt',
        priceEur: 10.0,
        priceEurFoil: 18.0, // Below maxPrice
      },
    };

    const mockCreatedAlert = {
      id: 'alert-1',
      userId: 'user-1',
      cardId: 'card-1',
      oldPrice: 20.0,
      newPrice: 18.0,
      read: false,
      createdAt: new Date(),
      card: mockWishlistItem.card,
    };

    (prisma.wishlistItem.findMany as jest.Mock).mockResolvedValue([mockWishlistItem]);
    (prisma.priceAlert.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.priceAlert.create as jest.Mock).mockResolvedValue(mockCreatedAlert);

    const alertsCreated = await checkWishlistPrices();

    expect(alertsCreated).toBe(1);
    expect(prisma.priceAlert.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        cardId: 'card-1',
        oldPrice: 20.0,
        newPrice: 18.0,
      },
      include: {
        card: true,
      },
    });
  });

  it('should skip items without current price', async () => {
    const mockWishlistItem = {
      userId: 'user-1',
      cardId: 'card-1',
      maxPrice: 10.0,
      foilOnly: false,
      card: {
        id: 'card-1',
        name: 'Rare Card',
        priceEur: null, // No price available
        priceEurFoil: null,
      },
    };

    (prisma.wishlistItem.findMany as jest.Mock).mockResolvedValue([mockWishlistItem]);

    const alertsCreated = await checkWishlistPrices();

    expect(alertsCreated).toBe(0);
    expect(prisma.priceAlert.create).not.toHaveBeenCalled();
  });

  it('should return 0 when no wishlist items have maxPrice', async () => {
    (prisma.wishlistItem.findMany as jest.Mock).mockResolvedValue([]);

    const alertsCreated = await checkWishlistPrices();

    expect(alertsCreated).toBe(0);
    expect(prisma.priceAlert.create).not.toHaveBeenCalled();
  });
});
