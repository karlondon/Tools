const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const profiles = [
  {
    email: 'isabelle@gild3d.com',
    password: 'SamplePass2026',
    displayName: 'Isabelle',
    age: 26,
    location: 'New York, NY',
    headline: 'Cultured, well-travelled & effortlessly charming',
    bio: 'A lover of art, fine dining, and meaningful conversation. I enjoy exploring the city\'s hidden gems and connecting with ambitious, cultured individuals who appreciate the finer things in life.',
    hourlyRate: null,
    inCall: true,
    outCall: true,
  },
  {
    email: 'sofia@gild3d.com',
    password: 'SamplePass2026',
    displayName: 'Sofia',
    age: 28,
    location: 'Miami, FL',
    headline: 'Sophisticated conversationalist with a passion for the finer things',
    bio: 'Born and raised between Miami and Milan, I bring a cosmopolitan perspective to every encounter. Whether it\'s a gallery opening, a yacht evening, or a quiet dinner, I am at ease in any setting.',
    hourlyRate: null,
    inCall: true,
    outCall: true,
  },
  {
    email: 'valentina@gild3d.com',
    password: 'SamplePass2026',
    displayName: 'Valentina',
    age: 25,
    location: 'Los Angeles, CA',
    headline: 'Warm, intelligent and always impeccably dressed',
    bio: 'A mindful soul with a love for wellness, cinema, and thoughtful conversation. I believe in genuine connections and take pride in being both a wonderful listener and a captivating presence.',
    hourlyRate: null,
    inCall: true,
    outCall: false,
  },
];

async function main() {
  console.log('=== SEEDING SAMPLE COMPANION PROFILES ===');
  for (const p of profiles) {
    const existing = await prisma.user.findUnique({ where: { email: p.email } });
    if (existing) {
      console.log('SKIP (exists): ' + p.email);
      continue;
    }
    const passwordHash = await bcrypt.hash(p.password, 12);
    const user = await prisma.user.create({
      data: {
        email: p.email,
        passwordHash,
        memberType: 'COMPANION',
        emailVerified: true,
        isActive: true,
        isVerified: true,
        profile: {
          create: {
            displayName: p.displayName,
            age: p.age,
            location: p.location,
        headline: p.headline,
        bio: p.bio,
        inCall: p.inCall,
            outCall: p.outCall,
            isPublished: true,
          },
        },
      },
      include: { profile: true },
    });
    console.log('CREATED: ' + p.displayName + ' (' + p.email + ') profileId=' + user.profile.id);
  }
  console.log('=== SAMPLE PROFILES DONE ===');
}

main()
  .catch(function(e) { console.error(e); process.exit(1); })
  .finally(function() { return prisma.$disconnect(); });