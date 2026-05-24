// @ts-nocheck
import { PrismaClient } from './src/generated/prisma/index.js';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const comps = await prisma.company.findMany();
  fs.writeFileSync('db_out.txt', JSON.stringify(comps, null, 2));
}

main().finally(() => prisma.$disconnect());
