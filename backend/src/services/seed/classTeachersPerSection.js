const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { User, Class, Section, Subject, ChatGroup } = require('../../models');
const { now } = require('../../utils/mongo');
const { memoryDir } = require('../../config/paths');

const TEACHER_PASS = 'Teacher@123';

/** Names for auto-created faculty (class teachers) beyond the original demo roster. */
const EXTRA_FACULTY = [
  ['Ramesh Pillai', 'faculty.ct01@schoolhub.demo'],
  ['Sunil Dutta', 'faculty.ct02@schoolhub.demo'],
  ['Meena Krishnan', 'faculty.ct03@schoolhub.demo'],
  ['Suresh Nambiar', 'faculty.ct04@schoolhub.demo'],
  ['Lakshmi Venkat', 'faculty.ct05@schoolhub.demo'],
  ['Arvind Bose', 'faculty.ct06@schoolhub.demo'],
  ['Kavitha Menon', 'faculty.ct07@schoolhub.demo'],
  ['Prakash Thakur', 'faculty.ct08@schoolhub.demo'],
  ['Deepa Iyer', 'faculty.ct09@schoolhub.demo'],
  ['Manoj Varma', 'faculty.ct10@schoolhub.demo'],
  ['Sunita Joshi', 'faculty.ct11@schoolhub.demo'],
  ['Naveen Reddy', 'faculty.ct12@schoolhub.demo'],
  ['Radha Srinivasan', 'faculty.ct13@schoolhub.demo'],
  ['Vikash Agarwal', 'faculty.ct14@schoolhub.demo'],
  ['Padmini Nair', 'faculty.ct15@schoolhub.demo'],
  ['Girish Malhotra', 'faculty.ct16@schoolhub.demo'],
  ['Anjali Saxena', 'faculty.ct17@schoolhub.demo'],
  ['Karthik Pillai', 'faculty.ct18@schoolhub.demo'],
  ['Bhavana Desai', 'faculty.ct19@schoolhub.demo'],
  ['Ritesh Kapoor', 'faculty.ct20@schoolhub.demo'],
  ['Swetha Raman', 'faculty.ct21@schoolhub.demo'],
  ['Mohandas Iyer', 'faculty.ct22@schoolhub.demo'],
];

/**
 * Ensures every section has a class_teacher_id, and each of those teachers
 * teaches at least one subject in that class (prefers Mathematics, English, Science
 * for the first sections by name order; further sections get the next free subject).
 * Idempotent: safe to run on every server start.
 */
async function seedClassTeachersPerSection() {
  try {
    const ts = now();
    const passHash = await bcrypt.hash(TEACHER_PASS, 10);

    for (const [name, email] of EXTRA_FACULTY) {
      const em = email.toLowerCase();
      const exists = await User.findOne({ email: em }).lean();
      if (!exists) {
        await User.create({
          id: randomUUID(),
          email: em,
          password_hash: passHash,
          name,
          role: 'teacher',
          is_approved: true,
          created_at: ts,
        });
      } else {
        await User.updateOne({ id: exists.id }, { $set: { is_approved: true, password_hash: passHash } });
      }
    }

    const demoTeachers = await User.find({
      role: 'teacher',
      is_approved: true,
      email: { $regex: /@schoolhub\.demo$/i },
    })
      .sort({ email: 1 })
      .select('id email name')
      .lean();

    if (demoTeachers.length === 0) {
      console.log('Class teachers seed: no @schoolhub.demo teachers found; run teachers seed first');
      return;
    }

    const classes = await Class.find().sort({ order: 1 }).lean();
    const sectionsFlat = [];
    for (const c of classes) {
      const secs = await Section.find({ class_id: c.id }).sort({ name: 1 }).lean();
      for (const s of secs) {
        sectionsFlat.push({ section: s, class_id: c.id, class_name: c.name });
      }
    }

    if (sectionsFlat.length === 0) return;

    for (let i = 0; i < sectionsFlat.length; i++) {
      const tid = demoTeachers[i % demoTeachers.length].id;
      await Section.updateOne({ id: sectionsFlat[i].section.id }, { $set: { class_teacher_id: tid } });
    }

    const preferredForSections = ['Mathematics', 'English', 'Science'];

    for (const c of classes) {
      const secs = await Section.find({ class_id: c.id }).sort({ name: 1 }).lean();
      const subs = await Subject.find({ class_id: c.id }).sort({ name: 1 }).lean();
      const byName = Object.fromEntries(subs.map((s) => [s.name, s]));
      const n = Math.min(3, secs.length, subs.length);
      const assignedIds = new Set();
      for (let i = 0; i < n; i++) {
        const ctId = secs[i].class_teacher_id;
        if (!ctId) continue;
        const prefName = preferredForSections[i];
        const sub = (prefName && byName[prefName]) || subs[i];
        if (sub) {
          await Subject.updateOne({ id: sub.id }, { $set: { teacher_id: ctId } });
          assignedIds.add(sub.id);
        }
      }
      for (let i = n; i < secs.length; i++) {
        const ctId = secs[i].class_teacher_id;
        if (!ctId) continue;
        const sub = subs.find((s) => !assignedIds.has(s.id));
        if (!sub) break;
        await Subject.updateOne({ id: sub.id }, { $set: { teacher_id: ctId } });
        assignedIds.add(sub.id);
      }
      let k = 0;
      for (const s of subs) {
        if (assignedIds.has(s.id)) continue;
        const tid = demoTeachers[k % demoTeachers.length].id;
        k += 1;
        await Subject.updateOne({ id: s.id }, { $set: { teacher_id: tid } });
      }
    }

    const tIds = demoTeachers.map((t) => t.id);
    await ChatGroup.updateOne(
      { name: 'Staff Room (Demo)' },
      { $addToSet: { members: { $each: tIds } } }
    );

    const kavita = await User.findOne({ email: 'classteacher@schoolhub.demo' }).lean();
    const c5 = await Class.findOne({ name: '5' }).lean();
    if (kavita && c5) {
      const sec5a = await Section.findOne({ class_id: c5.id, name: 'A' }).lean();
      if (sec5a) {
        await Section.updateOne({ id: sec5a.id }, { $set: { class_teacher_id: kavita.id } });
        const math5 = await Subject.findOne({ class_id: c5.id, name: 'Mathematics' }).lean();
        if (math5) await Subject.updateOne({ id: math5.id }, { $set: { teacher_id: kavita.id } });
      }
    }

    const credsPath = path.join(memoryDir, 'test_credentials.md');
    if (fs.existsSync(credsPath)) {
      const cur = fs.readFileSync(credsPath, 'utf8');
      if (!cur.includes('faculty.ct01@schoolhub.demo')) {
        fs.appendFileSync(
          credsPath,
          `\n## Extra class teachers (password: ${TEACHER_PASS})\n${EXTRA_FACULTY.map(([, e]) => `- ${e}`).join('\n')}\n`
        );
      }
    }

    console.log(
      `Class teachers: ${sectionsFlat.length} sections assigned; each section CT is assigned a subject in that class (Math/English/Science where available)`
    );
  } catch (err) {
    console.error('Class teachers per section seed error:', err);
  }
}

module.exports = { seedClassTeachersPerSection };
