const fs = require('fs');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const {
  User, Class, Section, Subject, ChatGroup, ChatMessage, AppMeta,
} = require('../../models');
const { now } = require('../../utils/mongo');
const { memoryDir } = require('../../config/paths');

async function seedTeachersChartsDemo() {
  try {
    if (await AppMeta.findOne({ key: 'schoolhub_teachers_charts_seed' }).lean()) return;
    const principal = await User.findOne({ role: 'principal' }).lean();
    if (!principal) return;

    const ts = now();
    const teacherPass = await bcrypt.hash('Teacher@123', 10);
    const roster = [
      ['Anita Rao', 'anita.rao@schoolhub.demo'],
      ['Ben Carter', 'ben.carter@schoolhub.demo'],
      ['Chitra Nair', 'chitra.nair@schoolhub.demo'],
      ['David Okonkwo', 'david.okonkwo@schoolhub.demo'],
      ['Elena Petrova', 'elena.petrova@schoolhub.demo'],
      ['Farhan Ali', 'farhan.ali@schoolhub.demo'],
      ['Greta Schmidt', 'greta.schmidt@schoolhub.demo'],
      ['Hassan Malik', 'hassan.malik@schoolhub.demo'],
    ];

    const teacherIds = [];
    const idToName = {};
    for (const [name, email] of roster) {
      let u = await User.findOne({ email: email.toLowerCase() }).lean();
      if (!u) {
        const id = randomUUID();
        await User.create({
          id,
          email: email.toLowerCase(),
          password_hash: teacherPass,
          name,
          role: 'teacher',
          is_approved: true,
          created_at: ts,
        });
        teacherIds.push(id);
        idToName[id] = name;
      } else {
        await User.updateOne({ id: u.id }, { $set: { is_approved: true } });
        teacherIds.push(u.id);
        idToName[u.id] = u.name;
      }
    }

    const classes = await Class.find().sort({ order: 1 }).lean();
    let subIdx = 0;
    for (const c of classes) {
      const subs = await Subject.find({ class_id: c.id }).sort({ name: 1 }).lean();
      for (const s of subs) {
        const tid = teacherIds[subIdx % teacherIds.length];
        subIdx += 1;
        await Subject.updateOne({ id: s.id }, { $set: { teacher_id: tid } });
      }
    }

    // Class teachers for all sections are assigned in seedClassTeachersPerSection.js

    const memberSet = [principal.id, ...teacherIds];
    if (!(await ChatGroup.findOne({ name: 'Staff Room (Demo)' }).lean())) {
      const gid = randomUUID();
      await ChatGroup.create({
        id: gid,
        name: 'Staff Room (Demo)',
        created_by: principal.id,
        members: memberSet,
        created_at: ts,
      });
      const thread = [
        [principal.id, 'Principal', 'Welcome everyone — use this thread for day-to-day coordination.'],
        [teacherIds[0], idToName[teacherIds[0]], 'Class 6 section A is all set for this week.'],
        [teacherIds[2], idToName[teacherIds[2]], 'Science lab inventory is updated.'],
        [teacherIds[4], idToName[teacherIds[4]], 'Great — I will share the reading list tomorrow.'],
      ];
      for (const [sid, sname, msg] of thread) {
        await ChatMessage.create({
          id: randomUUID(),
          group_id: gid,
          sender_id: sid,
          sender_name: sname,
          message: msg,
          created_at: ts,
        });
      }
    }

    if (!(await ChatGroup.findOne({ name: 'Academic Council (Demo)' }).lean())) {
      const small = [principal.id, teacherIds[0], teacherIds[1], teacherIds[2]];
      const gid2 = randomUUID();
      await ChatGroup.create({
        id: gid2,
        name: 'Academic Council (Demo)',
        created_by: principal.id,
        members: small,
        created_at: ts,
      });
      const thread2 = [
        [principal.id, 'Principal', 'Agenda: mid-term review and attendance trends.'],
        [teacherIds[1], idToName[teacherIds[1]], 'English averages are up 4% vs last term.'],
        [teacherIds[2], idToName[teacherIds[2]], 'Noted — I can present the lab usage stats next meeting.'],
      ];
      for (const [sid, sname, msg] of thread2) {
        await ChatMessage.create({
          id: randomUUID(),
          group_id: gid2,
          sender_id: sid,
          sender_name: sname,
          message: msg,
          created_at: ts,
        });
      }
    }

    const credsPath = require('path').join(memoryDir, 'test_credentials.md');
    const demoBlock = `

## Demo teachers (password for all: Teacher@123)
${roster.map(([n, e]) => `- ${n}: ${e}`).join('\n')}
`;
    if (fs.existsSync(credsPath)) {
      fs.appendFileSync(credsPath, demoBlock);
    }

    await AppMeta.create({ key: 'schoolhub_teachers_charts_seed', value: '1' });
    console.log(`Teachers & demo chat seeded: ${teacherIds.length} faculty, subjects assigned, 2 chat groups`);
  } catch (err) {
    console.error('Teachers/charts seed error:', err);
  }
}

module.exports = { seedTeachersChartsDemo };
