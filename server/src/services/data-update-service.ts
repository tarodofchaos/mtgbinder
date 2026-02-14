import { createReadStream, existsSync } from 'fs';
import { createGunzip } from 'zlib';
import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { pick } from 'stream-json/filters/Pick';
import { streamObject } from 'stream-json/streamers/StreamObject';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { 
  MTGJSON_ALL_PRINTINGS_URL, 
  MTGJSON_ALL_PRICES_TODAY_URL, 
  DATA_DIR,
  downloadFile,
  cleanupFile,
  MTGJSONSet,
  CardRecord
} from '../utils/mtgjson';

const BATCH_SIZE = 500;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Updates card data from AllPrintings.json
 */
export async function updateCardsWeekly(force = false): Promise<void> {
  let lastUpdateValue: string | null = null;
  try {
    const lastUpdate = await prisma.systemSetting.findUnique({ where: { key: 'last_card_update' } });
    lastUpdateValue = lastUpdate?.value || null;
  } catch (err) {
    logger.warn('SystemSetting table not found, proceeding with card update');
  }

  const now = new Date();

  if (!force && lastUpdateValue && (now.getTime() - new Date(lastUpdateValue).getTime() < WEEK_MS)) {
    logger.info('Skipping weekly card update, recently updated');
    return;
  }

  const filePath = `${DATA_DIR}/AllPrintings.json.gz`;
  try {
    await downloadFile(MTGJSON_ALL_PRINTINGS_URL, filePath);
    
    logger.info('Starting streaming card import...');
    
    let batch: CardRecord[] = [];
    let importedCards = 0;
    let setsProcessed = 0;
    let skippedDigital = 0;

    await new Promise<void>((resolve, reject) => {
      const pipeline = chain([
        createReadStream(filePath),
        createGunzip(),
        parser(),
        pick({ filter: 'data' }), 
        streamObject(),
      ]);

      pipeline.on('data', async ({ key, value }: { key: string; value: MTGJSONSet }) => {
        if (!value || !Array.isArray(value.cards)) return;

        const setCode = key;
        const setName = value.name || setCode;
        const isAlchemySet = setName.toLowerCase().includes('alchemy');
        const isMTGOSet = setName.toLowerCase().includes('magic online') || setName.toLowerCase().includes('masters edition');
        const isDigitalOnlySet = !!value.isOnlineOnly || isAlchemySet || isMTGOSet;
        
        setsProcessed++;

        for (const card of value.cards) {
          if (!card.uuid) continue;

          // Skip digital-only cards (Alchemy, MTGO exclusives, etc.)
          if (card.isOnlineOnly || isDigitalOnlySet || card.name.startsWith('A-')) {
            skippedDigital++;
            continue;
          }

          const spanishName = card.foreignData?.find(fd => fd.language === 'Spanish')?.name || null;

          batch.push({
            uuid: card.uuid,
            name: card.name || 'Unknown',
            nameEs: spanishName,
            setCode: card.setCode || setCode,
            setName: setName,
            rarity: card.rarity || 'unknown',
            colors: card.colors || [],
            manaCost: card.manaCost || null,
            manaValue: card.manaValue || 0,
            typeLine: card.type || '',
            oracleText: card.text || null,
            scryfallId: card.identifiers?.scryfallId || null,
            collectorNumber: card.number || '',
            isOnlineOnly: !!card.isOnlineOnly || isDigitalOnlySet,
          });

          if (batch.length >= BATCH_SIZE) {
            pipeline.pause();
            try {
              const result = await prisma.card.createMany({
                data: batch,
                skipDuplicates: true,
              });
              importedCards += result.count;
              batch = [];
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
          if (batch.length > 0) {
            const result = await prisma.card.createMany({
              data: batch,
              skipDuplicates: true,
            });
            importedCards += result.count;
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      pipeline.on('error', reject);
    });

    // Cleanup existing Alchemy/digital cards from the database
    const deleteResult = await prisma.card.deleteMany({
      where: {
        OR: [
          { isOnlineOnly: true },
          { setName: { contains: 'Alchemy', mode: 'insensitive' } },
          { name: { startsWith: 'A-' } }
        ]
      }
    });

    await prisma.systemSetting.upsert({
      where: { key: 'last_card_update' },
      update: { value: now.toISOString() },
      create: { key: 'last_card_update', value: now.toISOString() },
    });

    logger.info({ importedCards, setsProcessed, skippedDigital, deletedExisting: deleteResult.count }, 'Card data update complete');
  } catch (error) {
    logger.error({ error }, 'Failed to update card data');
  } finally {
    await cleanupFile(filePath);
  }
}

interface MTGJSONPriceData {
  paper?: {
    cardmarket?: {
      retail?: {
        normal?: Record<string, number>;
        foil?: Record<string, number>;
      };
    };
    tcgplayer?: {
      retail?: {
        normal?: Record<string, number>;
        foil?: Record<string, number>;
      };
    };
  };
}

/**
 * Updates prices from AllPricesToday.json
 */
export async function updatePricesDaily(force = false): Promise<void> {
  let lastUpdateValue: string | null = null;
  try {
    const lastUpdate = await prisma.systemSetting.findUnique({ where: { key: 'last_price_update' } });
    lastUpdateValue = lastUpdate?.value || null;
  } catch (err) {
    logger.warn('SystemSetting table not found, proceeding with price update');
  }

  const now = new Date();

  if (!force && lastUpdateValue && (now.getTime() - new Date(lastUpdateValue).getTime() < DAY_MS)) {
    logger.info('Skipping daily price update, recently updated');
    return;
  }

  const filePath = `${DATA_DIR}/AllPricesToday.json.gz`;
  try {
    await downloadFile(MTGJSON_ALL_PRICES_TODAY_URL, filePath);

    logger.info('Starting streaming price update...');

    let updatedCards = 0;
    let processedUuids = 0;
    let batch: { uuid: string; priceEur: number | null; priceEurFoil: number | null; priceUsd: number | null; priceUsdFoil: number | null }[] = [];

    await new Promise<void>((resolve, reject) => {
      const pipeline = chain([
        createReadStream(filePath),
        createGunzip(),
        parser(),
        pick({ filter: 'data' }),
        streamObject(),
      ]);

      pipeline.on('data', async ({ key: uuid, value: priceData }: { key: string; value: MTGJSONPriceData }) => {
        processedUuids++;

        const cm = priceData.paper?.cardmarket?.retail;
        const tcg = priceData.paper?.tcgplayer?.retail;

        if (!cm && !tcg) return;

        // Get most recent price from the date map (AllPricesToday should only have today's date)
        const getLatest = (map?: Record<string, number>) => {
          if (!map) return null;
          const dates = Object.keys(map).sort();
          return dates.length > 0 ? map[dates[dates.length - 1]] : null;
        };

        const priceEur = getLatest(cm?.normal);
        const priceEurFoil = getLatest(cm?.foil);
        const priceUsd = getLatest(tcg?.normal);
        const priceUsdFoil = getLatest(tcg?.foil);

        if (priceEur !== null || priceEurFoil !== null || priceUsd !== null || priceUsdFoil !== null) {
          batch.push({ uuid, priceEur, priceEurFoil, priceUsd, priceUsdFoil });
        }

        if (batch.length >= BATCH_SIZE) {
          pipeline.pause();
          try {
            // Prisma doesn't support bulk update with different values easily
            // We'll do it in a transaction
            await prisma.$transaction(
              batch.map(item => 
                prisma.card.updateMany({
                  where: { uuid: item.uuid },
                  data: {
                    priceEur: item.priceEur,
                    priceEurFoil: item.priceEurFoil,
                    priceUsd: item.priceUsd,
                    priceUsdFoil: item.priceUsdFoil,
                  }
                })
              )
            );
            updatedCards += batch.length;
            batch = [];
          } catch (err) {
            pipeline.destroy();
            reject(err);
            return;
          }
          pipeline.resume();
        }
      });

      pipeline.on('end', async () => {
        try {
          if (batch.length > 0) {
            await prisma.$transaction(
              batch.map(item => 
                prisma.card.updateMany({
                  where: { uuid: item.uuid },
                  data: {
                    priceEur: item.priceEur,
                    priceEurFoil: item.priceEurFoil,
                    priceUsd: item.priceUsd,
                    priceUsdFoil: item.priceUsdFoil,
                  }
                })
              )
            );
            updatedCards += batch.length;
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      pipeline.on('error', reject);
    });

    await prisma.systemSetting.upsert({
      where: { key: 'last_price_update' },
      update: { value: now.toISOString() },
      create: { key: 'last_price_update', value: now.toISOString() },
    });

    logger.info({ updatedCards, processedUuids }, 'Price update complete');
  } catch (error) {
    logger.error({ error }, 'Failed to update prices');
  } finally {
    await cleanupFile(filePath);
  }
}

/**
 * Main scheduler for data updates
 */
export function startDataUpdateScheduler(): NodeJS.Timeout {
  logger.info('Starting data update scheduler');

  // Check for updates every hour
  const interval = setInterval(async () => {
    try {
      await updatePricesDaily();
      await updateCardsWeekly();
    } catch (error) {
      logger.error({ error }, 'Scheduled data update failed');
    }
  }, 60 * 60 * 1000);

  // Run once on startup after a short delay
  setTimeout(async () => {
    try {
      await updatePricesDaily();
      await updateCardsWeekly();
    } catch (error) {
      logger.error({ error }, 'Startup data update failed');
    }
  }, 10000);

  return interval;
}
