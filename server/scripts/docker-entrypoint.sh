#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy --schema=./server/prisma/schema.prisma

# Function to import cards in background
import_cards_if_needed() {
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

  # Threshold check: baseline is ~108k. If less than 100k, we likely have an incomplete import.
  if [ "$CARD_COUNT" -lt "100000" ]; then
    if [ "$CARD_COUNT" = "0" ]; then
      echo "No cards found. Importing card data from MTGJSON in background..."
    else
      echo "Only $CARD_COUNT cards found. Resuming/Updating card data in background..."
    fi
    # Pipe output to stdout so it shows in docker logs (Coolify/Docker)
    node server/dist/scripts/import-mtgjson.js > /proc/1/fd/1 2>&1 &
  else
    echo "Card data already exists ($CARD_COUNT cards). Skipping import."
    # Check if Spanish names need to be populated
    update_spanish_names_if_needed
  fi
}

# Function to update Spanish names for existing cards
update_spanish_names_if_needed() {
  echo "Checking if Spanish names need to be populated..."
  SPANISH_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.card.count({ where: { nameEs: { not: null } } }).then(count => {
  console.log(count);
  prisma.\$disconnect();
}).catch(() => {
  console.log('0');
  prisma.\$disconnect();
});
")

  if [ "$SPANISH_COUNT" = "0" ]; then
    echo "No Spanish names found. Updating card data in background..."
    node server/dist/scripts/update-spanish-names.js > /proc/1/fd/1 2>&1 &
  else
    echo "Spanish names already populated ($SPANISH_COUNT cards). Skipping update."
  fi
}

# Run card import check in background (non-blocking)
import_cards_if_needed

echo "Starting server..."
exec node server/dist/src/index.js
