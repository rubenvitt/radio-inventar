import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AUTH_CONFIG } from '@radio-inventar/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Delete existing data (in correct order due to FK)
  await prisma.loan.deleteMany();
  await prisma.device.deleteMany();

  // Create demo devices
  const devices = await Promise.all([
    prisma.device.create({
      data: {
        callSign: 'Florian 4-21',
        serialNumber: 'SN-2021-001',
        deviceType: 'Handheld',
        status: 'AVAILABLE',
        notes: 'Neues Gerät, voller Akku',
      },
    }),
    prisma.device.create({
      data: {
        callSign: 'Florian 4-22',
        serialNumber: 'SN-2021-002',
        deviceType: 'Handheld',
        status: 'ON_LOAN',
      },
    }),
    prisma.device.create({
      data: {
        callSign: 'Florian 4-23',
        serialNumber: 'SN-2021-003',
        deviceType: 'Handheld',
        status: 'ON_LOAN',
      },
    }),
    prisma.device.create({
      data: {
        callSign: 'Florian 4-24',
        serialNumber: 'SN-2021-004',
        deviceType: 'Mobile',
        status: 'DEFECT',
        notes: 'Display defekt, zur Reparatur',
      },
    }),
    prisma.device.create({
      data: {
        callSign: 'Florian 4-25',
        serialNumber: 'SN-2021-005',
        deviceType: 'Handheld',
        status: 'MAINTENANCE',
        notes: 'Akku-Tausch geplant',
      },
    }),
  ]);

  console.log(`Created ${devices.length} devices`);

  // Create active loans for ON_LOAN devices
  const onLoanDevices = devices.filter(d => d.status === 'ON_LOAN');
  const loans = await Promise.all([
    prisma.loan.create({
      data: {
        deviceId: onLoanDevices[0]!.id,
        borrowerName: 'Tim Schäfer',
        borrowedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
    }),
    prisma.loan.create({
      data: {
        deviceId: onLoanDevices[1]!.id,
        borrowerName: 'Sandra Müller',
        borrowedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      },
    }),
  ]);

  console.log(`Created ${loans.length} active loans`);

  // Create admin user with configured bcrypt rounds (AC9: min 10, using 12)
  // Review #2: username must be lowercase (case-insensitive login)
  const passwordHash = await bcrypt.hash('admin123', AUTH_CONFIG.BCRYPT_ROUNDS);
  const adminUser = await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin', // Must be lowercase
      passwordHash,
    },
  });

  console.log(`Admin user created/verified: ${adminUser.username}`);
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
