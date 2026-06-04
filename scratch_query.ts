import { PrismaClient } from './src/generated/prisma/client/index.js';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRawUnsafe(`SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'systemic_entity_relations_strength_check'`);
  console.log(result);
}

main().finally(() => prisma.$disconnect());
