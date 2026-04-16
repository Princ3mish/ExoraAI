import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clear the database before tests run
  await prisma.participant.deleteMany({});
  await prisma.meeting.deleteMany({});
  await prisma.availability.deleteMany({});
  await prisma.user.deleteMany({});
});

afterAll(async () => {
  await prisma.$disconnect();
});
