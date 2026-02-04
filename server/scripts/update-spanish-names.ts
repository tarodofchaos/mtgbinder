import 'dotenv/config';
import { createReadStream, existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
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

interface ForeignData {
  language: string;
  name: string;
}

interface MTGJSONCard {
  uuid: string;
  name: string;
  foreignData?: ForeignData[];
}

interface MTGJSONSet {
  name: string;
  code: string;
  cards: MTGJSONCard[];
}

interface SpanishNameUpdate {
  uuid: string;
  nameEs: string;
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

async function flushBatch(batch: SpanishNameUpdate[]): Promise<number> {
  if (batch.length === 0) return 0;

  // Update each card individually (Prisma doesn't support updateMany with different values)
  const promises = batch.map(update =>
    prisma.card.updateMany({
      where: { uuid: update.uuid },
      data: { nameEs: update.nameEs },
    })
  );

  await Promise.all(promises);
  return batch.length;
}

async function updateSpanishNamesStreaming(filePath: string): Promise<void> {
  console.log('Starting Spanish names update...');
  console.log('This will take several minutes...\n');

  let batch: SpanishNameUpdate[] = [];
  let updatedCards = 0;
  let setsProcessed = 0;
  let cardsWithSpanish = 0;

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

      const set = value;
      setsProcessed++;

      for (const card of set.cards) {
        if (!card.uuid) continue;

        const spanishName = card.foreignData?.find(fd => fd.language === 'Spanish')?.name;
        if (spanishName) {
          cardsWithSpanish++;
          batch.push({
            uuid: card.uuid,
            nameEs: spanishName,
          });
        }

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
        console.log(`  Total sets processed: ${setsProcessed}`);
        console.log(`  Cards with Spanish names found: ${cardsWithSpanish}`);
        console.log(`  Cards updated: ${updatedCards}`);
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
    // Create data directory
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }

    // Download if not exists
    if (!existsSync(COMPRESSED_FILE)) {
      await downloadFile(MTGJSON_URL, COMPRESSED_FILE);
    } else {
      console.log('Using cached AllPrintings.json.gz');
    }

    // Stream parse and update
    await updateSpanishNamesStreaming(COMPRESSED_FILE);

    // Cleanup
    console.log('\nCleaning up...');
    await unlink(COMPRESSED_FILE);

    console.log('Done!');
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
