import { createReadStream, createWriteStream, existsSync } from 'fs';
import { mkdir, unlink } from 'fs/promises';
import { createGunzip } from 'zlib';
import { pipeline as streamPipeline } from 'stream/promises';
import { logger } from './logger';

export const MTGJSON_ALL_PRINTINGS_URL = 'https://mtgjson.com/api/v5/AllPrintings.json.gz';
export const MTGJSON_ALL_PRICES_TODAY_URL = 'https://mtgjson.com/api/v5/AllPricesToday.json.gz';
export const DATA_DIR = './data';

export interface MTGJSONCard {
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
  isOnlineOnly?: boolean;
  foreignData?: {
    language: string;
    name: string;
  }[];
}

export interface MTGJSONSet {
  name: string;
  code: string;
  releaseDate?: string;
  isOnlineOnly?: boolean;
  cards: MTGJSONCard[];
}

export interface CardRecord {
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
  isOnlineOnly: boolean;
  releasedAt: Date | null;
}

export async function downloadFile(url: string, dest: string): Promise<void> {
  logger.info({ url, dest }, 'Downloading MTGJSON file');

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }

  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }

  // @ts-ignore - Node fetch body is a ReadableStream
  await streamPipeline(response.body, createWriteStream(dest));
  
  logger.info({ dest }, 'Download complete');
}

export async function cleanupFile(path: string): Promise<void> {
  if (existsSync(path)) {
    await unlink(path);
  }
}
