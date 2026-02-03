import 'dotenv/config';
import { createReadStream, existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { createGunzip } from 'zlib';
import { PrismaClient } from '@prisma/client';
import { parser } from 'stream-json';
import { pick } from 'stream-json/filters/Pick';
import { streamObject } from 'stream-json/streamers/StreamObject';
import { chain } from 'stream-chain';

const prisma = new PrismaClient();

const MTGJSON_URL = 'https://mtgjson.com/api/v5/AllPrintings.json.gz';
const DATA_DIR = './data';
const COMPRESSED_FILE = `${DATA_DIR}/AllPrintings.json.gz`;
const BATCH_SIZE = 500;

interface MTGJSONCard {
  uuid: string;
  colors?: string[];
}

interface MTGJSONSet {
  cards: MTGJSONCard[];
}

interface ColorUpdate {
  uuid: string;
  colors: string[];
}

async function downloadFile(url: string, dest: string): Promise<void> {
  console.log(`Downloading ${url}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  await writeFile(dest, Buffer.from(buffer));
  console.log('Download complete');
}

async function flushBatch(batch: ColorUpdate[]): Promise<number> {
  if (batch.length === 0) return 0;

  // Update colors for each card by UUID
  await Promise.all(
    batch.map((update) =>
      prisma.card.updateMany({
        where: { uuid: update.uuid },
        data: { colors: update.colors },
      })
    )
  );

  return batch.length;
}

async function updateColorsStreaming(filePath: string): Promise<void> {
  console.log('Starting streaming color update...');
  console.log('This will take several minutes for ~100k+ cards...\n');

  let batch: ColorUpdate[] = [];
  let updatedCards = 0;
  let setsProcessed = 0;

  return new Promise((resolve, reject) => {
    const pipeline = chain([
      createReadStream(filePath),
      createGunzip(),
      parser(),
      pick({ filter: 'data' }),
      streamObject(),
    ]);

    pipeline.on('data', async ({ key, value }: { key: string; value: MTGJSONSet }) => {
      if (!value || !Array.isArray(value.cards)) return;

      setsProcessed++;

      for (const card of value.cards) {
        if (!card.uuid) continue;

        // MTGJSON colors field - empty array for colorless, array of W/U/B/R/G for colored
        const colors = card.colors || [];

        batch.push({
          uuid: card.uuid,
          colors,
        });

        if (batch.length >= BATCH_SIZE) {
          pipeline.pause();

          try {
            updatedCards += await flushBatch(batch);
            batch = [];
            process.stdout.write(`\rUpdated ${updatedCards} cards from ${setsProcessed} sets...`);
          } catch (err) {
            pipeline.destroy();
            reject(err);
            return;
          }

          pipeline.resume();
        }
      }
    });

    pipeline.on('end', async () => {
      try {
        updatedCards += await flushBatch(batch);
        console.log(`\n\nUpdate complete!`);
        console.log(`  Total sets: ${setsProcessed}`);
        console.log(`  Total cards updated: ${updatedCards}`);
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    pipeline.on('error', (err) => {
      reject(err);
    });
  });
}

async function main(): Promise<void> {
  try {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }

    if (!existsSync(COMPRESSED_FILE)) {
      await downloadFile(MTGJSON_URL, COMPRESSED_FILE);
    } else {
      console.log('Using cached AllPrintings.json.gz');
    }

    await updateColorsStreaming(COMPRESSED_FILE);

    console.log('Done!');
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
