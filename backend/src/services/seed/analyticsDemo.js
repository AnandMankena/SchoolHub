const { randomUUID } = require('crypto');
const {
  User, Class, Section, Student, Subject, Exam, Mark, Attendance, AppMeta,
} = require('../../models');
const { now } = require('../../utils/mongo');
const { nameForShRoll } = require('./indianStudentNames');

/** Rename legacy "Demo 5-A-1" style rows so existing DBs pick up Indian names without re-seeding. */
async function renameLegacyDemoStudents() {
  const victims = await Student.find({ roll_number: /^SH-/i, name: /^Demo / }).select('id roll_number name').lean();
  for (const s of victims) {
    const next = nameForShRoll(s.roll_number);
    if (next && next !== s.name) {
      await Student.updateOne({ id: s.id }, { $set: { name: next } });
    }
  }
  if (victims.length) {
    console.log(`Student names: updated ${victims.length} seeded demo rows to Indian names`);
  }
}

async function seedAnalyticsDemo() {
  try {
    await renameLegacyDemoStudents();

    if (await AppMeta.findOne({ key: 'schoolhub_analytics_seed' }).lean()) return;
    const principal = await User.findOne({ role: 'principal' }).lean();
    if (!principal) return;

    const classes = await Class.find().sort({ order: 1 }).limit(8).lean();
    if (classes.length === 0) return;

    const sections = [];
    for (const c of classes) {
      const sec = await Section.findOne({ class_id: c.id, name: 'A' }).lean();
      if (sec) sections.push({ ...sec, class_name: c.name });
    }
    if (sections.length === 0) return;

    const ts = now();
    const principalId = principal.id;

    for (const sec of sections) {
      const existingDemo = await Student.countDocuments({ section_id: sec.id, roll_number: /^SH-/ });
      if (existingDemo > 0) continue;
      const nExisting = await Student.countDocuments({ section_id: sec.id });
      if (nExisting >= 15) continue;
      for (let i = 1; i <= 18; i++) {
        const roll_number = `SH-${sec.class_name}-${sec.name}-${String(i).padStart(2, '0')}`;
        await Student.create({
          id: randomUUID(),
          name: nameForShRoll(roll_number),
          roll_number,
          section_id: sec.id,
          class_id: sec.class_id,
          created_at: ts,
        });
      }
    }

    const demoStudents = await Student.find({ roll_number: /^SH-/ }).select('id section_id class_id roll_number').lean();
    if (demoStudents.length === 0) {
      console.log('Analytics seed: no demo students inserted (sections may already be populated)');
      return;
    }

    const classIds = [...new Set(demoStudents.map((s) => s.class_id))];
    const examByClass = {};
    for (const clId of classIds) {
      let ex = await Exam.findOne({ class_id: clId, name: 'Mid Term (Demo)' }).lean();
      if (!ex) {
        const eid = randomUUID();
        await Exam.create({ id: eid, name: 'Mid Term (Demo)', class_id: clId, total_marks: 100, created_at: ts });
        ex = { id: eid, total_marks: 100 };
      }
      examByClass[clId] = ex;
    }

    const subjectsByClass = {};
    for (const clId of classIds) {
      const subs = await Subject.find({ class_id: clId }).limit(4).select('id').lean();
      subjectsByClass[clId] = subs.map((s) => s.id);
    }

    for (const st of demoStudents) {
      const exam = examByClass[st.class_id];
      if (!exam) continue;
      const subs = subjectsByClass[st.class_id] || [];
      let h = 0;
      for (let k = 0; k < st.roll_number.length; k++) h += st.roll_number.charCodeAt(k);
      for (let j = 0; j < Math.min(3, subs.length); j++) {
        const fail = (h + j * 13) % 6 === 0;
        const marks_obtained = fail ? 22 + ((h + j) % 15) : 52 + ((h + j * 7) % 44);
        await Mark.updateOne(
          { student_id: st.id, subject_id: subs[j], exam_id: exam.id },
          {
            $set: {
              id: randomUUID(),
              student_id: st.id,
              subject_id: subs[j],
              exam_id: exam.id,
              section_id: st.section_id,
              marks_obtained,
              total_marks: exam.total_marks || 100,
              entered_by: principalId,
              updated_at: ts,
            },
          },
          { upsert: true }
        );
      }
    }

    for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - daysAgo);
      const dateStr = d.toISOString().split('T')[0];
      for (const st of demoStudents) {
        let h = 0;
        for (let k = 0; k < st.roll_number.length; k++) h += st.roll_number.charCodeAt(k);
        const roll = (h + daysAgo * 11) % 10;
        let status = 'present';
        if (roll === 0 || roll === 1) status = 'absent';
        else if (roll === 2) status = 'late';
        await Attendance.updateOne(
          { student_id: st.id, date: dateStr },
          {
            $set: {
              id: randomUUID(),
              student_id: st.id,
              section_id: st.section_id,
              date: dateStr,
              status,
              marked_by: principalId,
              updated_at: ts,
            },
          },
          { upsert: true }
        );
      }
    }

    await AppMeta.create({ key: 'schoolhub_analytics_seed', value: '1' });
    console.log(`Analytics demo seeded: ${demoStudents.length} students, marks, 7-day attendance`);
  } catch (err) {
    console.error('Analytics seed error:', err);
  }
}

module.exports = { seedAnalyticsDemo };
