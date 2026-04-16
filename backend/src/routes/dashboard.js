const express = require('express');
const { Student, User, Class, Section, Subject } = require('../models');
const { authenticate } = require('../middleware/auth');
const { getClassTeacherOnlySection } = require('../services/teacherScope');

const router = express.Router();

router.get('/stats', authenticate, async (req, res) => {
  try {
    const scopedSec = await getClassTeacherOnlySection(req.user);
    if (req.user.role === 'teacher' && scopedSec) {
      const stu = await Student.countDocuments({ section_id: scopedSec.id });
      const cls = await Class.findOne({ id: scopedSec.class_id }).select('name').lean();
      return res.json({
        total_students: stu,
        total_teachers: 1,
        total_classes: 1,
        pending_approvals: 0,
        total_sections: 1,
        scoped_class_teacher: true,
        my_class_name: cls ? cls.name : '',
        my_section_name: scopedSec.name,
      });
    }
    const [total_students, total_teachers, total_classes, pending_approvals, total_sections] = await Promise.all([
      Student.countDocuments(),
      User.countDocuments({ role: 'teacher', is_approved: true }),
      Class.countDocuments(),
      User.countDocuments({ role: 'teacher', is_approved: false }),
      Section.countDocuments(),
    ]);
    res.json({ total_students, total_teachers, total_classes, pending_approvals, total_sections });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.get('/staff', authenticate, async (req, res) => {
  try {
    // Get principal info
    const principal = await User.findOne({ role: 'principal' })
      .select('-_id -__v -password_hash')
      .lean();

    // Get all approved teachers
    const teachers = await User.find({ role: 'teacher', is_approved: true })
      .select('-_id -__v -password_hash')
      .sort({ name: 1 })
      .lean();

    // Get subjects for each teacher
    const teacherIds = teachers.map(t => t.id);
    const subjects = await Subject.find({ teacher_id: { $in: teacherIds } })
      .select('teacher_id name class_id')
      .lean();

    // Get class info
    const classIds = [...new Set(subjects.map(s => s.class_id))];
    const classes = await Class.find({ id: { $in: classIds } })
      .select('id name')
      .lean();
    const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));

    // Get class teacher sections
    const sections = await Section.find({ class_teacher_id: { $in: teacherIds } })
      .select('class_teacher_id class_id name')
      .lean();
    const sectionMap = {};
    for (const sec of sections) {
      sectionMap[sec.class_teacher_id] = {
        class_name: classMap[sec.class_id] || '?',
        section: sec.name
      };
    }

    // Organize subjects by teacher
    const subjectsByTeacher = {};
    for (const sub of subjects) {
      if (!subjectsByTeacher[sub.teacher_id]) {
        subjectsByTeacher[sub.teacher_id] = [];
      }
      subjectsByTeacher[sub.teacher_id].push({
        name: sub.name,
        class_name: classMap[sub.class_id] || '?'
      });
    }

    // Attach subjects to teachers
    for (const teacher of teachers) {
      teacher.subjects = subjectsByTeacher[teacher.id] || [];
      teacher.class_teacher_section = sectionMap[teacher.id] || null;
    }

    res.json({ principal, teachers });
  } catch (err) { 
    res.status(500).json({ detail: err.message }); 
  }
});

module.exports = router;
