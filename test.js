const { PrismaClient } = require('./src/generated/prisma/index.js');
const prisma = new PrismaClient();
async function main() {
  const comps = await prisma.company.findMany();
  console.log('COMPANIES:', comps);
  const users = await prisma.users.findMany({ include: { company: true }});
  console.log('USERS:', users.map(u => u.company ? u.company.name : 'NO COMPANY'));
}
main().finally(() => prisma.$disconnect());
