#!/bin/sh
set -e

echo "--- STARTING DOCKER ENTRYPOINT ---"
date

echo "Running database migrations..."
npx prisma migrate deploy --schema=./server/prisma/schema.prisma

# Ensure log files exist and are writable
touch /app/data/import.log /app/data/spanish.log

# Cleanup digital-only cards that might have been imported previously
echo "Cleaning up digital-only cards (Alchemy, MTGO)..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.card.deleteMany({
  where: {
    OR: [
      { isOnlineOnly: true },
      { setName: { contains: 'Alchemy', mode: 'insensitive' } },
      { setName: { contains: 'Magic Online', mode: 'insensitive' } },
      { setName: { contains: 'Masters Edition', mode: 'insensitive' } },
      { name: { startsWith: 'A-' } }
    ]
  }
}).then(result => {
  console.log('Deleted ' + result.count + ' digital cards');
  prisma.\$disconnect();
}).catch(err => {
  console.error('Cleanup failed: ' + err.message);
  prisma.\$disconnect();
});
"

echo "Starting server..."
# The application now handles its own background data synchronization 
# via startDataUpdateScheduler in src/index.ts
exec node server/dist/src/index.js
