const fs = require('fs');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const {
  User, Class, Section, Subject, ChatGroup, AppMeta,
} = require('../../models');
const { now } = require('../../utils/mongo');
const { memoryDir } = require('../../config/paths');
const path = require('path');

async function seedDedicatedClassTeacher() {
  try {
    if (await AppMeta.findOne({ key: 'schoolhub_dedicated_class_teacher_seed' }).lean()) return;
    const ts = now();
    const email = 'classteacher@schoolhub.demo';
    const pass = await bcrypt.hash('ClassTeacher@123', 10);
    let u = await User.findOne({ email });
    let uid;
    if (!u) {
      uid = randomUUID();
      await User.create({
        id: uid,
        email,
        password_hash: pass,
        name: 'Ms. Kavita Iyer (Class Teacher)',
        role: 'teacher',
        is_approved: true,
        created_at: ts,
      });
    } else {
      uid = u.id;
      await User.updateOne({ id: uid }, { $set: { password_hash: pass, is_approved: true } });
    }
    await Subject.updateMany({ teacher_id: uid }, { $set: { teacher_id: null } });

    const c5 = await Class.findOne({ name: '5' }).lean();
    if (!c5) {
      await AppMeta.create({ key: 'schoolhub_dedicated_class_teacher_seed', value: '1' });
      console.log('Dedicated class teacher seed skipped: Class 5 not found');
      return;
    }
    const sec = await Section.findOne({ class_id: c5.id, name: 'A' }).lean();
    if (!sec) {
      await AppMeta.create({ key: 'schoolhub_dedicated_class_teacher_seed', value: '1' });
      return;
    }
    await ChatGroup.updateOne({ name: 'Staff Room (Demo)' }, { $addToSet: { members: uid } });

    const credsPath = path.join(memoryDir, 'test_credentials.md');
    const block = `

## Class teacher demo (scoped to one class in the app)
- Email: classteacher@schoolhub.demo
- Password: ClassTeacher@123
- Assigned as class teacher: Class 5, Section A
`;
    if (fs.existsSync(credsPath)) fs.appendFileSync(credsPath, block);

    await AppMeta.create({ key: 'schoolhub_dedicated_class_teacher_seed', value: '1' });
    console.log('Dedicated class teacher: classteacher@schoolhub.demo → Class 5 Section A');
  } catch (err) {
    console.error('Dedicated class teacher seed error:', err);
  }
}

module.exports = { seedDedicatedClassTeacher };
