const { Section, Subject } = require('../models');

/** Teacher has no subject assignments — dashboard & APIs scope to their class-teacher section only. */
async function getClassTeacherOnlySection(user) {
  if (!user || user.role !== 'teacher') return null;
  const subjCount = await Subject.countDocuments({ teacher_id: user.id });
  if (subjCount > 0) return null;
  return Section.findOne({ class_teacher_id: user.id }).select('id class_id name').lean();
}

/** Principal always; teacher if class teacher of section or teaches a subject in that class. */
async function teacherCanAccessSection(user, sectionId) {
  if (!user || user.role === 'principal') return true;
  if (user.role !== 'teacher') return false;
  const sec = await Section.findOne({ id: sectionId }).lean();
  if (!sec) return false;
  if (sec.class_teacher_id === user.id) return true;
  const subj = await Subject.findOne({ class_id: sec.class_id, teacher_id: user.id }).lean();
  return !!subj;
}

module.exports = { getClassTeacherOnlySection, teacherCanAccessSection };
