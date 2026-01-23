import 'dotenv/config';
import { createWriteStream, createReadStream, existsSync } from 'fs';
import { mkdir, unlink } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { PrismaClient } from '@prisma/client';
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';
import { chain } from 'stream-chain';

const prisma = new PrismaClient();

const DATA_DIR = './data';
const PRICES_FILE = DATA_DIR + '/scryfall-prices.json';
const BATCH_SIZE = 500;

interface ScryfallCard {
  id: string;
  name: string;
  prices: {
    eur: string | null;
    eur_foil: string | null;
    usd: string | null;
    usd_foil: string | null;
  };
}

interface PriceUpdate {
  scryfallId: string;
  priceEur: number | null;
  priceEurFoil: number | null;
  priceUsd: number | null;
  priceUsdFoil: number | null;
}

async function downloadBulkData(): Promise<string> {
  console.log('Fetching Scryfall bulk data info...');

  const response = await fetch('https://api.scryfall.com/bulk-data/default-cards');
  if (!response.ok) {
    throw new Error('Failed to get bulk data info: ' + response.statusText);
  }

  const bulkInfo = await response.json() as { download_uri: string; size: number };
  console.log('Download size: ' + (bulkInfo.size / 1024 / 1024).toFixed(1) + ' MB');

  console.log('Downloading Scryfall card data...');
  const dataResponse = await fetch(bulkInfo.download_uri);
  if (!dataResponse.ok || !dataResponse.body) {
    throw new Error('Failed to download bulk data: ' + dataResponse.statusText);
  }

  const fileStream = createWriteStream(PRICES_FILE);
  await pipeline(dataResponse.body as unknown as NodeJS.ReadableStream, fileStream);

  console.log('Download complete!');
  return PRICES_FILE;
}

async function updatePricesInBatch(updates: PriceUpdate[]): Promise<number> {
  if (updates.length === 0) return 0;

  let updated = 0;

  await prisma.$transaction(async (tx) => {
    for (const update of updates) {
      const result = await tx.card.updateMany({
        where: { scryfallId: update.scryfallId },
        data: {
          priceEur: update.priceEur,
          priceEurFoil: update.priceEurFoil,
          priceUsd: update.priceUsd,
          priceUsdFoil: update.priceUsdFoil,
        },
      });
      updated += result.count;
    }
  });

  return updated;
}

async function importPrices(filePath: string): Promise<void> {
  console.log('Importing prices...');

  let batch: PriceUpdate[] = [];
  let processed = 0;
  let updated = 0;
  let withPrices = 0;

  return new Promise((resolve, reject) => {
    const pipelineStream = chain([
      createReadStream(filePath),
      parser(),
      streamArray(),
    ]);

    pipelineStream.on('data', async ({ value }: { value: ScryfallCard }) => {
      processed++;

      const prices = value.prices;
      if (!prices.eur && !prices.eur_foil && !prices.usd && !prices.usd_foil) {
        return;
      }

      withPrices++;

      batch.push({
        scryfallId: value.id,
        priceEur: prices.eur ? parseFloat(prices.eur) : null,
        priceEurFoil: prices.eur_foil ? parseFloat(prices.eur_foil) : null,
        priceUsd: prices.usd ? parseFloat(prices.usd) : null,
        priceUsdFoil: prices.usd_foil ? parseFloat(prices.usd_foil) : null,
      });

      if (batch.length >= BATCH_SIZE) {
        pipelineStream.pause();

        try {
          updated += await updatePricesInBatch(batch);
          batch = [];
          process.stdout.write('\rProcessed ' + processed + ' cards, updated ' + updated + ' prices...');
        } catch (err) {
          pipelineStream.destroy();
          reject(err);
          return;
        }

        pipelineStream.resume();
      }
    });

    pipelineStream.on('end', async () => {
      try {
        updated += await updatePricesInBatch(batch);
        console.log('\n\nPrice import complete!');
        console.log('  Total cards processed: ' + processed);
        console.log('  Cards with prices: ' + withPrices);
        console.log('  Database records updated: ' + updated);
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    pipelineStream.on('error', (err) => {
      reject(err);
    });
  });
}

async function main(): Promise<void> {
  try {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }

    const filePath = await downloadBulkData();
    await importPrices(filePath);

    console.log('\nCleaning up...');
    await unlink(filePath);

    const withPrice = await prisma.card.count({ where: { priceEur: { not: null } } });
    console.log('\nVerification: ' + withPrice + ' cards now have EUR prices');

    console.log('Done!');
  } catch (error) {
    console.error('Price update failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
