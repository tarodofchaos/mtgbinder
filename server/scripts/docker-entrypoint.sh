#!/bin/sh
set -e

echo "--- STARTING DOCKER ENTRYPOINT ---"
date

echo "Running database migrations..."
npx prisma migrate deploy --schema=./server/prisma/schema.prisma

# Ensure log files exist and are writable
touch /app/data/import.log /app/data/spanish.log

# Function to import cards in background
import_cards_if_needed() {
  echo "Checking if card data needs to be imported..."
  CARD_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.card.count().then(count => {
  process.stdout.write(count.toString());
  prisma.\$disconnect();
}).catch((err) => {
  process.stderr.write('Error counting cards: ' + err.message);
  process.stdout.write('0');
  prisma.\$disconnect();
});
")

  echo "Current card count in DB: $CARD_COUNT"

  if [ "$CARD_COUNT" -lt "100000" ]; then
    if [ "$CARD_COUNT" = "0" ]; then
      echo "No cards found. Importing card data from MTGJSON in background..."
    else
      echo "Only $CARD_COUNT cards found. Resuming/Updating card data in background..."
    fi
    # Log to a file we can tail
    node server/dist/scripts/import-mtgjson.js >> /app/data/import.log 2>&1 &
    # Tail the log in background so it appears in docker logs
    tail -f /app/data/import.log &
  else
    echo "Card data already exists ($CARD_COUNT cards). Skipping import."
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
  process.stdout.write(count.toString());
  prisma.\$disconnect();
}).catch(() => {
  process.stdout.write('0');
  prisma.\$disconnect();
});
")

  echo "Current Spanish names count: $SPANISH_COUNT"

  if [ "$SPANISH_COUNT" = "0" ]; then
    echo "No Spanish names found. Updating card data in background..."
    node server/dist/scripts/update-spanish-names.js >> /app/data/spanish.log 2>&1 &
    tail -f /app/data/spanish.log &
  else
    echo "Spanish names already populated ($SPANISH_COUNT cards). Skipping update."
  fi
}

# Run card import check in background (non-blocking)
import_cards_if_needed

echo "Starting server..."
exec node server/dist/src/index.js
