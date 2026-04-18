import { PrismaClient } from '@prisma/client';

export default async () => {
  const prisma = new PrismaClient();
  await prisma.$disconnect();
};
