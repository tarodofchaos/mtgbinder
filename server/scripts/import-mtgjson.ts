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
const BATCH_SIZE = 1000;

interface MTGJSONCard {
  uuid: string;
  name: string;
  setCode: string;
  rarity: string;
  manaCost?: string;
  manaValue?: number;
  type: string;
  text?: string;
  identifiers?: {
    scryfallId?: string;
  };
  number: string;
}

interface MTGJSONSet {
  name: string;
  code: string;
  cards: MTGJSONCard[];
}

interface CardRecord {
  uuid: string;
  name: string;
  setCode: string;
  setName: string;
  rarity: string;
  manaCost: string | null;
  manaValue: number;
  typeLine: string;
  oracleText: string | null;
  scryfallId: string | null;
  collectorNumber: string;
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

async function flushBatch(batch: CardRecord[]): Promise<number> {
  if (batch.length === 0) return 0;

  await prisma.card.createMany({
    data: batch,
    skipDuplicates: true,
  });

  return batch.length;
}

async function importCardsStreaming(filePath: string): Promise<void> {
  console.log('Starting streaming card import...');
  console.log('This will take several minutes for ~100k+ cards...\n');

  let batch: CardRecord[] = [];
  let importedCards = 0;
  let setsProcessed = 0;

  return new Promise((resolve, reject) => {
    // MTGJSON structure: { "meta": {...}, "data": { "SET_CODE": { name, cards: [...] }, ... } }
    // We use pick to select 'data' and streamObject to get each set
    const pipeline = chain([
      createReadStream(filePath),
      createGunzip(),
      parser(),
      pick({ filter: 'data' }), // Select the 'data' object
      streamObject(), // Stream each set as { key: 'SET_CODE', value: { name, cards, ... } }
    ]);

    pipeline.on('data', async ({ key, value }: { key: string; value: MTGJSONSet }) => {
      if (!value || !Array.isArray(value.cards)) return;

      const set = value;
      const setCode = key;
      setsProcessed++;

      for (const card of set.cards) {
        if (!card.uuid) continue; // Skip cards without UUID

        batch.push({
          uuid: card.uuid,
          name: card.name || 'Unknown',
          setCode: card.setCode || setCode,
          setName: set.name || setCode,
          rarity: card.rarity || 'unknown',
          manaCost: card.manaCost || null,
          manaValue: card.manaValue || 0,
          typeLine: card.type || '',
          oracleText: card.text || null,
          scryfallId: card.identifiers?.scryfallId || null,
          collectorNumber: card.number || '',
        });

        if (batch.length >= BATCH_SIZE) {
          // Pause stream while we flush
          pipeline.pause();

          try {
            importedCards += await flushBatch(batch);
            batch = [];
            process.stdout.write(`\rImported ${importedCards} cards from ${setsProcessed} sets...`);
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
        // Flush remaining cards
        importedCards += await flushBatch(batch);
        console.log(`\n\nImport complete!`);
        console.log(`  Total sets: ${setsProcessed}`);
        console.log(`  Total cards: ${importedCards}`);
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

    // Stream parse and import
    await importCardsStreaming(COMPRESSED_FILE);

    // Cleanup
    console.log('\nCleaning up...');
    await unlink(COMPRESSED_FILE);

    console.log('Done!');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
