const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = new PrismaClient();

function makePassword(len) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes).map(function(b){ return chars[b % chars.length]; }).join('');
}

async function main() {
  const admins = ['admin1@gild3d.com', 'admin2@gild3d.com'];
  console.log('=== GILDED COMPANIONS SUPER ADMIN SEED ===');
  for (var i = 0; i < admins.length; i++) {
    var email = admins[i];
    var existing = await prisma.user.findUnique({ where: { email: email } });
    if (existing) { console.log('SKIP (exists): ' + email); continue; }
    var pw = makePassword(20);
    var hash = await bcrypt.hash(pw, 12);
    await prisma.user.create({
      data: {
        email: email,
        passwordHash: hash,
        memberType: 'SUPER_ADMIN',
        emailVerified: true,
        isActive: true,
        isVerified: true
      }
    });
    console.log('CREATED: ' + email);
    console.log('PASSWORD: ' + pw);
  }
  console.log('=== SAVE PASSWORDS ABOVE - NOT SHOWN AGAIN ===');
}

main().catch(function(e){ console.error(e); process.exit(1); }).finally(function(){ return prisma.$disconnect(); });