import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { customAlphabet } from 'nanoid';

const prisma = new PrismaClient();
const generateShareCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

async function main() {
  console.log('Seeding database...');

  // Create test users
  const password = await bcrypt.hash('password123', 12);

  const userA = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      passwordHash: password,
      displayName: 'Alice',
      shareCode: generateShareCode(),
    },
  });

  const userB = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      passwordHash: password,
      displayName: 'Bob',
      shareCode: generateShareCode(),
    },
  });

  console.log('Created test users:');
  console.log(`  - Alice: ${userA.email} (share code: ${userA.shareCode})`);
  console.log(`  - Bob: ${userB.email} (share code: ${userB.shareCode})`);
  console.log('  - Password for both: password123');

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
