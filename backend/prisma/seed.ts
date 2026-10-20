import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { encrypt } from '../src/common/utils/crypto.util';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SATIVA v4 database seeding...');

  // 1. Clean database (order matters for foreign key constraints)
  await prisma.divisionWellbeingInsight.deleteMany();
  await prisma.wellbeingFeedback.deleteMany();
  await prisma.attendanceCheckout.deleteMany();
  await prisma.attendanceCheckin.deleteMany();
  await prisma.user.deleteMany();
  await prisma.officeLocation.deleteMany();
  await prisma.division.deleteMany();
  await prisma.organization.deleteMany();

  console.log('✅ Database cleaned.');

  // 2. Create Organization with invite code
  const org = await prisma.organization.create({
    data: {
      name: 'Klinik Kecantikan BelajarVibe',
      inviteCode: 'KLINIK-SATIVA-2026',
    },
  });
  console.log(`✅ Organization created: ${org.name} (invite: ${org.inviteCode})`);

  // 3. Create Office Location (Clinic coordinates)
  const officeHQ = await prisma.officeLocation.create({
    data: {
      organizationId: org.id,
      label: 'Klinik Pusat',
      latitude: -6.2088,
      longitude: 106.8456,
      radiusMeters: 100,
    },
  });
  console.log(`✅ Office location created: ${officeHQ.label}`);

  // 4. Create Klinik Kecantikan Divisions
  const divHR = await prisma.division.create({
    data: {
      organizationId: org.id,
      name: 'HR',
    },
  });

  const divPerawat = await prisma.division.create({
    data: {
      organizationId: org.id,
      name: 'Perawat',
    },
  });

  const divBeautician = await prisma.division.create({
    data: {
      organizationId: org.id,
      name: 'Beautician',
    },
  });

  const divFrontOffice = await prisma.division.create({
    data: {
      organizationId: org.id,
      name: 'Front Office',
    },
  });
  console.log('✅ Klinik Divisions created: HR, Perawat, Beautician, Front Office');

  // 5. Create Users
  const passwordHash = bcrypt.hashSync('password123', 10);
  const hrPasswordHash = bcrypt.hashSync('passwordKUAT123', 10);

  const owner = await prisma.user.create({
    data: {
      organizationId: org.id,
      role: 'owner',
      fullName: 'Owner Klinik',
      email: 'owner@belajarvibe.com',
      passwordHash,
    },
  });

  const hr = await prisma.user.create({
    data: {
      organizationId: org.id,
      role: 'hr',
      fullName: 'Rindi Superadmin HR',
      email: 'rindimia79@gmail.com',
      passwordHash: hrPasswordHash,
      divisionId: divHR.id,
    },
  });

  // Beautician Employees (6 users -> complies with privacy threshold of min 5)
  const beauticianEmployees = [
    { fullName: 'Siti Beautician', email: 'siti@belajarvibe.com' },
    { fullName: 'Candra Beautician', email: 'candra@belajarvibe.com' },
    { fullName: 'Elisa Beautician', email: 'elisa@belajarvibe.com' },
    { fullName: 'Fani Beautician', email: 'fani@belajarvibe.com' },
    { fullName: 'Gita Beautician', email: 'gita@belajarvibe.com' },
    { fullName: 'Hana Beautician', email: 'hana@belajarvibe.com' },
  ];

  const mUsers: any[] = [];
  for (const emp of beauticianEmployees) {
    const u = await prisma.user.create({
      data: {
        organizationId: org.id,
        divisionId: divBeautician.id,
        role: 'karyawan',
        fullName: emp.fullName,
        email: emp.email,
        passwordHash,
      },
    });
    mUsers.push(u);
  }

  // Perawat Employees (4 users -> below privacy threshold of 5 to demonstrate privacy lock)
  const perawatEmployees = [
    { fullName: 'Indra Perawat', email: 'indra@belajarvibe.com' },
    { fullName: 'Joko Perawat', email: 'joko@belajarvibe.com' },
    { fullName: 'Kartika Perawat', email: 'kartika@belajarvibe.com' },
    { fullName: 'Laras Perawat', email: 'laras@belajarvibe.com' },
  ];

  const oUsers: any[] = [];
  for (const emp of perawatEmployees) {
    const u = await prisma.user.create({
      data: {
        organizationId: org.id,
        divisionId: divPerawat.id,
        role: 'karyawan',
        fullName: emp.fullName,
        email: emp.email,
        passwordHash,
      },
    });
    oUsers.push(u);
  }

  console.log('✅ Users seeded (1 owner, 1 HR, 6 marketing, 4 operations)');

  // 6. Seed 14 days of Attendance + Anonymous Wellbeing Feedback
  const today = new Date();

  // Mood / note templates for Marketing (high burnout/stress)
  const mWellnessTemplates = [
    { mood: 2, note: 'Lembur lagi malam ini, lelah sekali rasanya.' },
    { mood: 3, note: 'Kerja lembur bagai kuda, target penjualan naik terus.' },
    { mood: 2, note: 'Stres berat dengan revisi campaign yang tiada henti.' },
    { mood: 3, note: 'Tim solid tapi capek banget. Butuh libur panjang.' },
    { mood: 2, note: 'Kurang tidur karena meeting pagi jam 7:30 terus.' },
    { mood: 1, note: 'Burnout parah. Pingin resign kalau begini terus.' },
    { mood: 3, note: 'Biasa saja hari ini, tapi workload menumpuk.' },
  ];

  // Mood / note templates for Operations (stable/happy)
  const oWellnessTemplates = [
    { mood: 5, note: 'Hari ini lancar jaya! Kerja lapangan seru.' },
    { mood: 4, note: 'Capek fisik tapi senang, tim operasional kompak.' },
    { mood: 4, note: 'Pekerjaan selesai tepat waktu, bisa pulang tenggo.' },
    { mood: 5, note: 'Suka sekali dengan support dari teman-teman kerja.' },
  ];

  console.log('📅 Seeding 14 days of historical attendance + feedback...');

  for (let i = 14; i >= 0; i--) {
    const currentDate = new Date(today);
    currentDate.setDate(today.getDate() - i);

    // Skip weekends
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // --- SEED MARKETING TEAM ---
    for (const user of mUsers) {
      // 90% attendance probability
      if (Math.random() > 0.1) {
        const isLate = Math.random() > 0.7; // 30% late
        const checkInHour = isLate ? 9 + Math.floor(Math.random() * 2) : 8;
        const checkInMin = Math.floor(Math.random() * 60);

        const checkInTime = new Date(currentDate);
        checkInTime.setHours(checkInHour, checkInMin, 0, 0);

        // Calculate late minutes
        const shiftStartTime = new Date(currentDate);
        shiftStartTime.setHours(8, 0, 0, 0);
        const lateMinutes = isLate ? Math.max(0, Math.floor((checkInTime.getTime() - shiftStartTime.getTime()) / 60000)) : 0;

        // Small random offset from office to simulate "near office" (within 100m)
        const latOffset = (Math.random() - 0.5) * 0.001; // ~55m
        const lonOffset = (Math.random() - 0.5) * 0.001;
        const userLat = officeHQ.latitude + latOffset;
        const userLon = officeHQ.longitude + lonOffset;
        const distance = Math.sqrt(latOffset ** 2 + lonOffset ** 2) * 111000; // rough meters

        // PATH 1: Attendance Check-in (identifikatif)
        const checkin = await prisma.attendanceCheckin.create({
          data: {
            userId: user.id,
            officeLocationId: officeHQ.id,
            checkInTime,
            latitude: userLat,
            longitude: userLon,
            distanceMeters: Math.round(distance * 100) / 100,
            isWithinGeofence: true,
            lateMinutes,
            attendanceStatus: i > 0 ? 'hadir' : 'belum_lengkap', // Today's entries are "belum_lengkap"
          },
        });

        // Check-out (for past days only, not today)
        if (i > 0) {
          const checkOutHour = 17 + Math.floor(Math.random() * 2); // 17-18
          const checkOutMin = Math.floor(Math.random() * 60);
          const checkOutTime = new Date(currentDate);
          checkOutTime.setHours(checkOutHour, checkOutMin, 0, 0);

          await prisma.attendanceCheckout.create({
            data: {
              checkinId: checkin.id,
              userId: user.id,
              checkOutTime,
              latitude: userLat + (Math.random() - 0.5) * 0.0005,
              longitude: userLon + (Math.random() - 0.5) * 0.0005,
              distanceMeters: Math.round(Math.random() * 80 * 100) / 100,
              isWithinGeofence: true,
            },
          });

          // PATH 2: Anonymous Wellbeing Feedback (NO user_id!)
          const template = mWellnessTemplates[Math.floor(Math.random() * mWellnessTemplates.length)];
          await prisma.wellbeingFeedback.create({
            data: {
              divisionId: divBeautician.id,
              organizationId: org.id,
              submittedDate: checkOutTime,
              moodScore: template.mood,
              noteText: encrypt(template.note),
              processed: true,
            },
          });
        }
      }
    }

    // --- SEED PERAWAT TEAM ---
    for (const user of oUsers) {
      // 80% attendance probability
      if (Math.random() > 0.2) {
        const isLate = Math.random() > 0.9; // 10% late
        const checkInHour = isLate ? 9 : 8;
        const checkInMin = Math.floor(Math.random() * 30);

        const checkInTime = new Date(currentDate);
        checkInTime.setHours(checkInHour, checkInMin, 0, 0);

        const shiftStartTime = new Date(currentDate);
        shiftStartTime.setHours(8, 0, 0, 0);
        const lateMinutes = isLate ? Math.max(0, Math.floor((checkInTime.getTime() - shiftStartTime.getTime()) / 60000)) : 0;

        const latOffset = (Math.random() - 0.5) * 0.001;
        const lonOffset = (Math.random() - 0.5) * 0.001;
        const userLat = officeHQ.latitude + latOffset;
        const userLon = officeHQ.longitude + lonOffset;
        const distance = Math.sqrt(latOffset ** 2 + lonOffset ** 2) * 111000;

        const checkin = await prisma.attendanceCheckin.create({
          data: {
            userId: user.id,
            officeLocationId: officeHQ.id,
            checkInTime,
            latitude: userLat,
            longitude: userLon,
            distanceMeters: Math.round(distance * 100) / 100,
            isWithinGeofence: true,
            lateMinutes,
            attendanceStatus: i > 0 ? 'hadir' : 'belum_lengkap',
          },
        });

        if (i > 0) {
          const checkOutHour = 17;
          const checkOutMin = Math.floor(Math.random() * 30);
          const checkOutTime = new Date(currentDate);
          checkOutTime.setHours(checkOutHour, checkOutMin, 0, 0);

          await prisma.attendanceCheckout.create({
            data: {
              checkinId: checkin.id,
              userId: user.id,
              checkOutTime,
              latitude: userLat + (Math.random() - 0.5) * 0.0005,
              longitude: userLon + (Math.random() - 0.5) * 0.0005,
              distanceMeters: Math.round(Math.random() * 60 * 100) / 100,
              isWithinGeofence: true,
            },
          });

          const template = oWellnessTemplates[Math.floor(Math.random() * oWellnessTemplates.length)];
          await prisma.wellbeingFeedback.create({
            data: {
              divisionId: divPerawat.id,
              organizationId: org.id,
              submittedDate: checkOutTime,
              moodScore: template.mood,
              noteText: encrypt(template.note),
              processed: true,
            },
          });
        }
      }
    }
  }

  console.log('✅ 14 days of attendance + feedback seeded.');

  // 7. Seed Division Wellbeing Insights (aggregated data for HR dashboard)
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(today.getDate() - 7);

  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(today.getDate() - 14);

  // Beautician: declining trend (burnout indicators)
  await prisma.divisionWellbeingInsight.create({
    data: {
      divisionId: divBeautician.id,
      periodStart: twoWeeksAgo,
      periodEnd: oneWeekAgo,
      avgMoodScore: 2.8,
      respondentCount: 6,
      dominantThemes: JSON.stringify(['overwork', 'fatigue', 'stress']),
      trendDirection: 'stabil',
      riskLevel: 'perlu_perhatian',
    },
  });

  await prisma.divisionWellbeingInsight.create({
    data: {
      divisionId: divBeautician.id,
      periodStart: oneWeekAgo,
      periodEnd: today,
      avgMoodScore: 2.3,
      respondentCount: 6,
      dominantThemes: JSON.stringify(['burnout', 'overwork', 'resignation']),
      trendDirection: 'menurun',
      riskLevel: 'kritis',
    },
  });

  // Perawat: 4 employees (below threshold of 5 to demonstrate privacy lock)
  await prisma.divisionWellbeingInsight.create({
    data: {
      divisionId: divPerawat.id,
      periodStart: twoWeeksAgo,
      periodEnd: oneWeekAgo,
      avgMoodScore: 4.2,
      respondentCount: 4,
      dominantThemes: JSON.stringify(['teamwork', 'satisfaction']),
      trendDirection: 'stabil',
      riskLevel: 'aman',
    },
  });

  console.log('✅ Division wellbeing insights seeded.');
  console.log('');
  console.log('🎉 SATIVA Klinik Kecantikan seeding completed!');
  console.log('');
  console.log('📋 Login Credentials:');
  console.log('   Superadmin HR → rindimia79@gmail.com / passwordKUAT123');
  console.log('   Owner         → owner@belajarvibe.com / password123');
  console.log('   Beautician    → siti@belajarvibe.com  / password123');
  console.log('   Perawat       → indra@belajarvibe.com / password123');
  console.log(`   Invite Code   → ${org.inviteCode}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
