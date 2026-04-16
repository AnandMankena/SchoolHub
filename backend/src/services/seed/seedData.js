const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const {
  User, Class, Section, Subject,
} = require('../../models');
const { ADMIN_EMAIL, ADMIN_PASSWORD, DEFAULT_SUBJECTS } = require('../../config/env');
const { now } = require('../../utils/mongo');
const { memoryDir } = require('../../config/paths');
const { seedAnalyticsDemo } = require('./analyticsDemo');
const { seedTeachersChartsDemo } = require('./teachersChartsDemo');
const { seedDedicatedClassTeacher } = require('./dedicatedClassTeacher');
const { seedClassTeachersPerSection } = require('./classTeachersPerSection');

async function seedData() {
  try {
    let existing = await User.findOne({ email: ADMIN_EMAIL });
    if (!existing) {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await User.create({ id: randomUUID(), email: ADMIN_EMAIL, password_hash: hash, name: 'Principal', role: 'principal', is_approved: true, created_at: now() });
      console.log(`Principal account created: ${ADMIN_EMAIL}`);
    } else {
      const match = await bcrypt.compare(ADMIN_PASSWORD, existing.password_hash);
      if (!match) {
        const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
        await User.updateOne({ email: ADMIN_EMAIL }, { $set: { password_hash: hash } });
        console.log('Principal password updated');
      }
    }

    const classCount = await Class.countDocuments();
    if (classCount === 0) {
      for (let i = 1; i <= 10; i++) {
        const classId = randomUUID();
        await Class.create({ id: classId, name: String(i), order: i, created_at: now() });
        for (const sectionName of ['A', 'B', 'C']) {
          await Section.create({ id: randomUUID(), class_id: classId, name: sectionName, class_teacher_id: null, created_at: now() });
        }
        for (const subjectName of DEFAULT_SUBJECTS) {
          await Subject.create({ id: randomUUID(), name: subjectName, class_id: classId, teacher_id: null, created_at: now() });
        }
      }
      console.log('Seeded classes 1-10 with sections and subjects');
    }

    await seedAnalyticsDemo();
    await seedTeachersChartsDemo();
    await seedDedicatedClassTeacher();
    await seedClassTeachersPerSection();

    if (!fs.existsSync(memoryDir)) fs.mkdirSync(memoryDir, { recursive: true });
    fs.writeFileSync(path.join(memoryDir, 'test_credentials.md'),
      `# Test Credentials\n\n## Principal (Admin)\n- Email: ${ADMIN_EMAIL}\n- Password: ${ADMIN_PASSWORD}\n- Role: principal\n\n## Auth Endpoints\n- POST /api/auth/login\n- POST /api/auth/register\n- GET /api/auth/me\n`
    );
    console.log('Data seeding complete');
  } catch (err) { console.error('Seeding error:', err); }
}

module.exports = { seedData };
