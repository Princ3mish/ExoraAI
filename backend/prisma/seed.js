import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create admin account
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@exora.ai';
  const adminExists = await prisma.user.findFirst({
    where: { email: adminEmail }
  });

  if (!adminExists) {
    const hash = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || 'changeme123',
      10
    );
    await prisma.user.create({
      data: {
        name: process.env.ADMIN_NAME || 'Admin',
        email: adminEmail,
        password: hash,
        role: 'ADMIN',
        credits: 9999,
        plan: 'pro'
      }
    });
    console.log('✓ Admin created:', adminEmail);
  } else {
    console.log('✓ Admin already exists, skipping');
  }

  // Create demo account
  const demoExists = await prisma.user.findFirst({
    where: { email: 'demo@exora.ai' }
  });

  if (!demoExists) {
    const hash = await bcrypt.hash('demo123', 10);
    const demo = await prisma.user.create({
      data: {
        name: 'Demo User',
        email: 'demo@exora.ai',
        password: hash,
        role: 'USER',
        credits: 50,
        plan: 'free'
      }
    });
    console.log('✓ Demo user created: demo@exora.ai / demo123');

    // Seed demo meetings
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    dayAfter.setHours(10, 0, 0, 0);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(15, 0, 0, 0);

    await prisma.meeting.createMany({
      data: [
        {
          title: 'Product roadmap review',
          time: tomorrow,
          organizerId: demo.id,
          status: 'PENDING',
          confirmationStatus: 'confirmed',
          voiceCallStatus: 'completed',
          agendaTopics: [
            'Q3 feature priorities',
            'Engineering capacity',
            'Launch timeline'
          ]
        },
        {
          title: 'Investor sync',
          time: dayAfter,
          organizerId: demo.id,
          status: 'PENDING',
          confirmationStatus: 'unconfirmed',
          voiceCallStatus: 'pending',
          agendaTopics: []
        },
        {
          title: 'Team standup',
          time: nextWeek,
          organizerId: demo.id,
          status: 'PENDING',
          confirmationStatus: 'confirmed',
          voiceCallStatus: 'completed',
          agendaTopics: [
            'Sprint progress update',
            'Blockers this week',
            'Goals for next sprint'
          ]
        }
      ]
    });
    console.log('✓ Demo meetings seeded');

  } else {
    console.log('✓ Demo user already exists, skipping');
  }

  await prisma.$disconnect();
  console.log('Seed complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
