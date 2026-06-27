import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AUTH_CONFIG } from '@radio-inventar/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Devices are no longer stored locally — they live in radio-admin and are
  // fetched read-only at runtime. We only seed local loans (with a device
  // snapshot) and the admin user. `deviceId` references a radio-admin device id
  // (cuid2); for demo data we use plausible mock ids (no FK constraint).
  await prisma.loan.deleteMany();

  const loans = await Promise.all([
    prisma.loan.create({
      data: {
        deviceId: 'seeddevflorian422000000a',
        snapshotCallSign: 'Florian 4-22',
        snapshotSerialNumber: 'SN-2021-002',
        snapshotDeviceType: 'Handheld',
        borrowerName: 'Tim Schäfer',
        borrowedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
    }),
    prisma.loan.create({
      data: {
        deviceId: 'seeddevflorian423000000b',
        snapshotCallSign: 'Florian 4-23',
        snapshotSerialNumber: 'SN-2021-003',
        snapshotDeviceType: 'Handheld',
        borrowerName: 'Sandra Müller',
        borrowedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      },
    }),
  ]);

  console.log(`Created ${loans.length} active loans`);

  // Create admin user with configured bcrypt rounds (username must be lowercase
  // for case-insensitive login).
  const passwordHash = await bcrypt.hash('admin123', AUTH_CONFIG.BCRYPT_ROUNDS);
  const adminUser = await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
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
