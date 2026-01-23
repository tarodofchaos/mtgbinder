/**
 * Script to add test cards for trade to a user's collection.
 * Run with: npx tsx scripts/add-test-trades.ts <userEmail>
 */

import { PrismaClient, CardCondition } from '@prisma/client';

const prisma = new PrismaClient();

const CONDITIONS: CardCondition[] = ['M', 'NM', 'LP', 'MP', 'HP'];

async function main() {
  const userEmail = process.argv[2];

  if (!userEmail) {
    console.error('Usage: npx tsx scripts/add-test-trades.ts <userEmail>');
    process.exit(1);
  }

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    console.error(`User with email "${userEmail}" not found`);
    process.exit(1);
  }

  console.log(`Adding test trade cards for user: ${user.displayName} (${user.email})`);

  // Get 70 random cards from the database
  const cards = await prisma.card.findMany({
    take: 70,
    orderBy: { name: 'asc' },
  });

  if (cards.length === 0) {
    console.error('No cards found in database. Please import cards first.');
    process.exit(1);
  }

  console.log(`Found ${cards.length} cards to add`);

  // Add each card to the user's collection as available for trade
  let added = 0;
  let skipped = 0;

  for (const card of cards) {
    // Check if user already has this card
    const existing = await prisma.collectionItem.findFirst({
      where: {
        userId: user.id,
        cardId: card.id,
      },
    });

    if (existing) {
      // Update to mark for trade if not already
      if (existing.forTrade === 0) {
        await prisma.collectionItem.update({
          where: { id: existing.id },
          data: {
            forTrade: Math.floor(Math.random() * 3) + 1, // 1-3 for trade
            quantity: Math.max(existing.quantity, Math.floor(Math.random() * 4) + 1),
          },
        });
        added++;
      } else {
        skipped++;
      }
    } else {
      // Create new collection item marked for trade
      const quantity = Math.floor(Math.random() * 4) + 1; // 1-4 copies
      const forTrade = Math.floor(Math.random() * quantity) + 1; // 1 to quantity for trade
      const condition = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
      const hasFoil = Math.random() > 0.7;

      await prisma.collectionItem.create({
        data: {
          userId: user.id,
          cardId: card.id,
          quantity,
          foilQuantity: hasFoil ? Math.floor(Math.random() * 2) + 1 : 0,
          condition,
          forTrade,
          tradePrice: Math.random() > 0.8 ? Math.round(Math.random() * 20 * 100) / 100 : null,
        },
      });
      added++;
    }
  }

  console.log(`Done! Added/updated ${added} cards for trade, skipped ${skipped} already-for-trade cards.`);
  console.log(`User's share code: ${user.shareCode}`);
  console.log(`View at: http://localhost:3000/binder/${user.shareCode}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
