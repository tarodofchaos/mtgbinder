#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy --schema=./server/prisma/schema.prisma

# Check if cards table is empty and import if needed
echo "Checking if card data needs to be imported..."
CARD_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.card.count().then(count => {
  console.log(count);
  prisma.\$disconnect();
}).catch(() => {
  console.log('0');
  prisma.\$disconnect();
});
")

if [ "$CARD_COUNT" = "0" ]; then
  echo "No cards found. Importing card data from MTGJSON..."
  echo "This will take several minutes..."
  node server/dist/scripts/import-mtgjson.js
else
  echo "Card data already exists ($CARD_COUNT cards). Skipping import."
fi

echo "Starting server..."
exec node server/dist/src/index.js
