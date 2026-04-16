const {
  User,
  Class,
  Student,
  Subject,
  Mark,
  Attendance,
} = require('../models');

async function buildPrincipalAnalyticsPayload(today) {
  const total_students = await Student.countDocuments();
  const attToday = await Attendance.find({ date: today }).select('status student_id').lean();
  let present = 0;
  let absent = 0;
  let late = 0;
  for (const a of attToday) {
    if (a.status === 'present') present++;
    else if (a.status === 'absent') absent++;
    else if (a.status === 'late') late++;
  }
  const marked = present + absent + late;
  const unmarked = Math.max(0, total_students - marked);
  const rate_of_total = total_students > 0 ? Math.round((present / total_students) * 1000) / 10 : 0;
  const rate_of_marked = marked > 0 ? Math.round((present / marked) * 1000) / 10 : 0;

  const marksAll = await Mark.find().lean();
  let sumSc = 0;
  let sumWt = 0;
  let pass_count = 0;
  let fail_count = 0;
  for (const m of marksAll) {
    const tot = m.total_marks || 100;
    sumWt += tot;
    sumSc += m.marks_obtained || 0;
    const pct = tot > 0 ? (m.marks_obtained || 0) / tot : 0;
    if (pct >= 0.4) pass_count++;
    else fail_count++;
  }
  const graded_entries = marksAll.length;
  const average_percentage = sumWt > 0 ? Math.round((sumSc / sumWt) * 1000) / 10 : 0;
  const pf = pass_count + fail_count;
  const pass_rate = pf > 0 ? Math.round((pass_count / pf) * 1000) / 10 : 0;
  const fail_rate = pf > 0 ? Math.round((fail_count / pf) * 1000) / 10 : 0;

  const attendance_trend = [];
  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - daysAgo);
    const dateStr = d.toISOString().split('T')[0];
    const recs = await Attendance.find({ date: dateStr }).lean();
    let p = 0;
    for (const r of recs) if (r.status === 'present') p++;
    const counted = recs.length;
    const rate = counted > 0 ? Math.round((p / counted) * 1000) / 10 : 0;
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    attendance_trend.push({ date: dateStr, label, present: p, counted, rate });
  }

  const studentIds = [...new Set(marksAll.map((m) => m.student_id))];
  const studs = await Student.find({ id: { $in: studentIds } }).select('id class_id').lean();
  const sidToClass = Object.fromEntries(studs.map((s) => [s.id, s.class_id]));
  const classBuckets = {};
  for (const m of marksAll) {
    const cid = sidToClass[m.student_id];
    if (!cid) continue;
    const tot = m.total_marks || 100;
    if (!classBuckets[cid]) classBuckets[cid] = { sc: 0, wt: 0 };
    classBuckets[cid].sc += m.marks_obtained || 0;
    classBuckets[cid].wt += tot;
  }
  const clsDocs = await Class.find({ id: { $in: Object.keys(classBuckets) } }).lean();
  const idToName = Object.fromEntries(clsDocs.map((c) => [c.id, c.name]));
  const class_avg = Object.entries(classBuckets)
    .map(([cid, { sc, wt }]) => ({
      class_name: idToName[cid] || cid,
      avg_percentage: wt > 0 ? Math.round((sc / wt) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.avg_percentage - a.avg_percentage)
    .slice(0, 12);

  const subjectsAll = await Subject.find().select('id name class_id teacher_id').lean();
  const subById = Object.fromEntries(subjectsAll.map((s) => [s.id, s]));
  const clsById = Object.fromEntries((await Class.find().select('id name').lean()).map((c) => [c.id, c.name]));

  const nameBucket = {};
  for (const m of marksAll) {
    const sub = subById[m.subject_id];
    if (!sub) continue;
    const nm = sub.name || 'Unknown';
    const tot = m.total_marks || 100;
    if (!nameBucket[nm]) nameBucket[nm] = { sc: 0, wt: 0, cnt: 0 };
    nameBucket[nm].sc += m.marks_obtained || 0;
    nameBucket[nm].wt += tot;
    nameBucket[nm].cnt += 1;
  }
  const subject_group_avg = Object.entries(nameBucket)
    .map(([subject_name, { sc, wt, cnt }]) => ({
      subject_name,
      avg_percentage: wt > 0 ? Math.round((sc / wt) * 1000) / 10 : 0,
      mark_count: cnt,
    }))
    .sort((a, b) => b.mark_count - a.mark_count)
    .slice(0, 12);

  const tidBucket = {};
  for (const m of marksAll) {
    const sub = subById[m.subject_id];
    if (!sub?.teacher_id) continue;
    const tid = sub.teacher_id;
    const tot = m.total_marks || 100;
    if (!tidBucket[tid]) tidBucket[tid] = { sc: 0, wt: 0, count: 0 };
    tidBucket[tid].sc += m.marks_obtained || 0;
    tidBucket[tid].wt += tot;
    tidBucket[tid].count += 1;
  }
  const teacherIdsForMarks = Object.keys(tidBucket);
  const teacherDocs = await User.find({ id: { $in: teacherIdsForMarks } }).select('id name').lean();
  const tidToName = Object.fromEntries(teacherDocs.map((u) => [u.id, u.name]));
  const teacher_one_on_one = teacherIdsForMarks
    .map((tid) => ({
      teacher_id: tid,
      teacher_name: tidToName[tid] || 'Teacher',
      avg_percentage: tidBucket[tid].wt > 0 ? Math.round((tidBucket[tid].sc / tidBucket[tid].wt) * 1000) / 10 : 0,
      marks_count: tidBucket[tid].count,
    }))
    .sort((a, b) => b.marks_count - a.marks_count)
    .slice(0, 14);

  const facultyTeachers = await User.find({ role: 'teacher', is_approved: true }).select('id name email').sort({ name: 1 }).limit(40).lean();
  const faculty = [];
  for (const t of facultyTeachers) {
    const subs = subjectsAll.filter((s) => s.teacher_id === t.id);
    faculty.push({
      id: t.id,
      name: t.name,
      email: t.email,
      subjects: subs.slice(0, 8).map((s) => ({
        name: s.name,
        class_name: clsById[s.class_id] || '?',
      })),
      subject_count: subs.length,
    });
  }

  return {
    date: today,
    scoped_class_teacher: false,
    total_students,
    attendance_today: {
      marked,
      present,
      absent,
      late,
      unmarked,
      rate_of_total,
      rate_of_marked,
    },
    marks: {
      graded_entries,
      average_percentage,
      pass_count,
      fail_count,
      pass_rate,
      fail_rate,
    },
    attendance_trend,
    class_avg,
    subject_group_avg,
    teacher_one_on_one,
    faculty,
  };
}

async function buildClassTeacherAnalyticsPayload(today, homeroom) {
  const clsDoc = await Class.findOne({ id: homeroom.class_id }).select('name').lean();
  const clsName = clsDoc?.name || 'Class';
  const sectionName = homeroom.name || '';
  const scope_label = `${clsName} — Section ${sectionName}`;

  const studRows = await Student.find({ section_id: homeroom.id }).select('id').lean();
  const studentIds = studRows.map((s) => s.id);
  const total_students = studentIds.length;

  const attToday = total_students === 0
    ? []
    : await Attendance.find({ date: today, student_id: { $in: studentIds } }).select('status student_id').lean();
  let present = 0;
  let absent = 0;
  let late = 0;
  for (const a of attToday) {
    if (a.status === 'present') present++;
    else if (a.status === 'absent') absent++;
    else if (a.status === 'late') late++;
  }
  const marked = present + absent + late;
  const unmarked = Math.max(0, total_students - marked);
  const rate_of_total = total_students > 0 ? Math.round((present / total_students) * 1000) / 10 : 0;
  const rate_of_marked = marked > 0 ? Math.round((present / marked) * 1000) / 10 : 0;

  const marksAll = total_students === 0 ? [] : await Mark.find({ student_id: { $in: studentIds } }).lean();
  let sumSc = 0;
  let sumWt = 0;
  let pass_count = 0;
  let fail_count = 0;
  for (const m of marksAll) {
    const tot = m.total_marks || 100;
    sumWt += tot;
    sumSc += m.marks_obtained || 0;
    const pct = tot > 0 ? (m.marks_obtained || 0) / tot : 0;
    if (pct >= 0.4) pass_count++;
    else fail_count++;
  }
  const graded_entries = marksAll.length;
  const average_percentage = sumWt > 0 ? Math.round((sumSc / sumWt) * 1000) / 10 : 0;
  const pf = pass_count + fail_count;
  const pass_rate = pf > 0 ? Math.round((pass_count / pf) * 1000) / 10 : 0;
  const fail_rate = pf > 0 ? Math.round((fail_count / pf) * 1000) / 10 : 0;

  const attendance_trend = [];
  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - daysAgo);
    const dateStr = d.toISOString().split('T')[0];
    const recs = total_students === 0
      ? []
      : await Attendance.find({ date: dateStr, student_id: { $in: studentIds } }).lean();
    let p = 0;
    for (const r of recs) if (r.status === 'present') p++;
    const counted = recs.length;
    const rate = counted > 0 ? Math.round((p / counted) * 1000) / 10 : 0;
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    attendance_trend.push({ date: dateStr, label, present: p, counted, rate });
  }

  const classAvgPct = sumWt > 0 ? Math.round((sumSc / sumWt) * 1000) / 10 : 0;
  const class_avg = [{ class_name: scope_label, avg_percentage: classAvgPct }];

  const subjectsAll = await Subject.find({ class_id: homeroom.class_id }).select('id name class_id teacher_id').lean();
  const subById = Object.fromEntries(subjectsAll.map((s) => [s.id, s]));
  const clsById = Object.fromEntries((await Class.find({ id: homeroom.class_id }).select('id name').lean()).map((c) => [c.id, c.name]));

  const nameBucket = {};
  for (const m of marksAll) {
    const sub = subById[m.subject_id];
    if (!sub) continue;
    const nm = sub.name || 'Unknown';
    const tot = m.total_marks || 100;
    if (!nameBucket[nm]) nameBucket[nm] = { sc: 0, wt: 0, cnt: 0 };
    nameBucket[nm].sc += m.marks_obtained || 0;
    nameBucket[nm].wt += tot;
    nameBucket[nm].cnt += 1;
  }
  const subject_group_avg = Object.entries(nameBucket)
    .map(([subject_name, { sc, wt, cnt }]) => ({
      subject_name,
      avg_percentage: wt > 0 ? Math.round((sc / wt) * 1000) / 10 : 0,
      mark_count: cnt,
    }))
    .sort((a, b) => b.mark_count - a.mark_count)
    .slice(0, 12);

  const tidBucket = {};
  for (const m of marksAll) {
    const sub = subById[m.subject_id];
    if (!sub?.teacher_id) continue;
    const tid = sub.teacher_id;
    const tot = m.total_marks || 100;
    if (!tidBucket[tid]) tidBucket[tid] = { sc: 0, wt: 0, count: 0 };
    tidBucket[tid].sc += m.marks_obtained || 0;
    tidBucket[tid].wt += tot;
    tidBucket[tid].count += 1;
  }
  const teacherIdsForMarks = Object.keys(tidBucket);
  const teacherDocs = await User.find({ id: { $in: teacherIdsForMarks } }).select('id name').lean();
  const tidToName = Object.fromEntries(teacherDocs.map((u) => [u.id, u.name]));
  const teacher_one_on_one = teacherIdsForMarks
    .map((tid) => ({
      teacher_id: tid,
      teacher_name: tidToName[tid] || 'Teacher',
      avg_percentage: tidBucket[tid].wt > 0 ? Math.round((tidBucket[tid].sc / tidBucket[tid].wt) * 1000) / 10 : 0,
      marks_count: tidBucket[tid].count,
    }))
    .sort((a, b) => b.marks_count - a.marks_count)
    .slice(0, 14);

  const teacherIdsInClass = [...new Set(subjectsAll.map((s) => s.teacher_id).filter(Boolean))];
  const facultyTeachers = await User.find({ id: { $in: teacherIdsInClass }, role: 'teacher', is_approved: true }).select('id name email').sort({ name: 1 }).limit(40).lean();
  const faculty = [];
  for (const t of facultyTeachers) {
    const subs = subjectsAll.filter((s) => s.teacher_id === t.id);
    faculty.push({
      id: t.id,
      name: t.name,
      email: t.email,
      subjects: subs.slice(0, 8).map((s) => ({
        name: s.name,
        class_name: clsById[s.class_id] || '?',
      })),
      subject_count: subs.length,
    });
  }

  return {
    date: today,
    scoped_class_teacher: true,
    scope_label,
    total_students,
    attendance_today: {
      marked,
      present,
      absent,
      late,
      unmarked,
      rate_of_total,
      rate_of_marked,
    },
    marks: {
      graded_entries,
      average_percentage,
      pass_count,
      fail_count,
      pass_rate,
      fail_rate,
    },
    attendance_trend,
    class_avg,
    subject_group_avg,
    teacher_one_on_one,
    faculty,
  };
}

module.exports = {
  buildPrincipalAnalyticsPayload,
  buildClassTeacherAnalyticsPayload,
};
