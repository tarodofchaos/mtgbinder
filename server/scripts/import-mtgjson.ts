import 'dotenv/config';
import { updateCardsWeekly, updatePricesDaily } from '../src/services/data-update-service';
import { prisma } from '../src/utils/prisma';
import { logger } from '../src/utils/logger';

async function main() {
  const refresh = process.argv.includes('--refresh');
  
  try {
    logger.info('Starting manual MTGJSON import...');
    
    // Update cards first
    await updateCardsWeekly(refresh);
    
    // Then update prices
    await updatePricesDaily(refresh);
    
    logger.info('Manual import complete!');
  } catch (error) {
    logger.error({ error }, 'Manual import failed');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
