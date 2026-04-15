import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generatePassword(length = 20): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
  return Array.from(crypto.randomBytes(length))
    .map(b => chars[b % chars.length])
    .join('');
}

async function main() {
  const admins = [
    { email: 'admin1@gild3d.com', name: 'Super Admin 1' },
    { email: 'admin2@gild3d.com', name: 'Super Admin 2' },
  ];

  console.log('\n========================================');
  console.log('  GILDED COMPANIONS — SUPER ADMIN SEED');
  console.log('========================================\n');

  for (const admin of admins) {
    const existing = await prisma.user.findUnique({ where: { email: admin.email } });
    if (existing) {
      console.log(`⚠  ${admin.email} already exists — skipping`);
      continue;
    }

    const password = generatePassword(24);
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email: admin.email,
        passwordHash,
        memberType: 'SUPER_ADMIN',
        emailVerified: true,
        isActive: true,
        isVerified: true,
      },
    });

    console.log(`✅ Created: ${admin.email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: SUPER_ADMIN\n`);
  }

  console.log('========================================');
  console.log('  IMPORTANT: Save these passwords now!');
  console.log('  They will NOT be shown again.');
  console.log('========================================\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());