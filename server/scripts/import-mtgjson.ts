import 'dotenv/config';
import { createReadStream, existsSync, createWriteStream } from 'fs';
import { mkdir, unlink } from 'fs/promises';
import { createGunzip } from 'zlib';
import { PrismaClient } from '@prisma/client';
import { parser } from 'stream-json';
import { pick } from 'stream-json/filters/Pick';
import { streamObject } from 'stream-json/streamers/StreamObject';
import { chain } from 'stream-chain';
import { pipeline as streamPipeline } from 'stream/promises';

const prisma = new PrismaClient();

const MTGJSON_URL = 'https://mtgjson.com/api/v5/AllPrintings.json.gz';
const DATA_DIR = './data';
const COMPRESSED_FILE = `${DATA_DIR}/AllPrintings.json.gz`;
const BATCH_SIZE = 1000;

interface ForeignData {
  language: string;
  name: string;
}

interface MTGJSONCard {
  uuid: string;
  name: string;
  setCode: string;
  rarity: string;
  colors?: string[];
  manaCost?: string;
  manaValue?: number;
  type: string;
  text?: string;
  identifiers?: {
    scryfallId?: string;
  };
  number: string;
  foreignData?: ForeignData[];
}

interface MTGJSONSet {
  name: string;
  code: string;
  cards: MTGJSONCard[];
}

interface CardRecord {
  uuid: string;
  name: string;
  nameEs: string | null;
  setCode: string;
  setName: string;
  rarity: string;
  colors: string[];
  manaCost: string | null;
  manaValue: number;
  typeLine: string;
  oracleText: string | null;
  scryfallId: string | null;
  collectorNumber: string;
}

async function downloadFile(url: string, dest: string): Promise<void> {
  console.log(`Downloading ${url} to ${dest}...`);

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }

  // Use streaming pipeline to save memory
  // @ts-ignore - Node 22 fetch body is a ReadableStream
  await streamPipeline(response.body, createWriteStream(dest));
  
  console.log('Download complete');
}

async function flushBatch(batch: CardRecord[]): Promise<number> {
  if (batch.length === 0) return 0;

  try {
    const result = await prisma.card.createMany({
      data: batch,
      skipDuplicates: true,
    });
    return result.count;
  } catch (err) {
    console.error('\nBatch insert failed:', err);
    // Log one sample card to help debug
    if (batch.length > 0) {
      console.error('Sample card:', JSON.stringify(batch[0], null, 2));
    }
    throw err;
  }
}

async function importCardsStreaming(filePath: string): Promise<void> {
  console.log('Starting streaming card import...');
  
  // Optimization: Get already processed set codes to skip them entirely
  const existingSetCodes = await prisma.card.findMany({
    select: { setCode: true },
    distinct: ['setCode'],
  }).then(results => new Set(results.map(r => r.setCode)));
  
  console.log(`Already have ${existingSetCodes.size} sets in database.`);
  console.log('This will take several minutes for ~100k+ cards...\n');

  let batch: CardRecord[] = [];
  let importedCards = 0;
  let setsProcessed = 0;
  let setsSkipped = 0;

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
      const setCode = key;
      
      // Skip if we already have this set fully processed
      if (existingSetCodes.has(setCode)) {
        setsSkipped++;
        return;
      }

      setsProcessed++;
      
      if (setsProcessed <= 20 || setsProcessed % 50 === 0) {
        console.log(`Processing set ${setsProcessed} (total seen: ${setsProcessed + setsSkipped}): ${set.name} (${setCode}) - ${set.cards.length} cards...`);
      }

      for (const card of set.cards) {
        if (!card.uuid) continue;

        const spanishName = card.foreignData?.find(fd => fd.language === 'Spanish')?.name || null;

        batch.push({
          uuid: card.uuid,
          name: card.name || 'Unknown',
          nameEs: spanishName,
          setCode: card.setCode || setCode,
          setName: set.name || setCode,
          rarity: card.rarity || 'unknown',
          colors: card.colors || [],
          manaCost: card.manaCost || null,
          manaValue: card.manaValue || 0,
          typeLine: card.type || '',
          oracleText: card.text || null,
          scryfallId: card.identifiers?.scryfallId || null,
          collectorNumber: card.number || '',
        });

        if (batch.length >= BATCH_SIZE) {
          pipeline.pause();

          try {
            const count = await flushBatch(batch);
            importedCards += count;
            batch = [];
            
            if (importedCards > 0 && importedCards % 5000 < BATCH_SIZE) {
              console.log(`Progress: Imported ${importedCards} new cards from ${setsProcessed} new sets...`);
            }
          } catch (err) {
            console.error('Import process interrupted:', err);
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
        importedCards += await flushBatch(batch);
        console.log(`\n\nImport complete!`);
        console.log(`  New sets processed: ${setsProcessed}`);
        console.log(`  Sets skipped (already in DB): ${setsSkipped}`);
        console.log(`  New cards imported: ${importedCards}`);
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

    await importCardsStreaming(COMPRESSED_FILE);

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
