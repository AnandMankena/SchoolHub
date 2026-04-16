const express = require('express');
const { randomUUID } = require('crypto');
const { Class, Section, Student, Subject, Exam, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { clean, now } = require('../utils/mongo');
const { getClassTeacherOnlySection } = require('../services/teacherScope');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const scopedSec = await getClassTeacherOnlySection(req.user);
    if (req.user.role === 'teacher' && scopedSec) {
      const cls = await Class.findOne({ id: scopedSec.class_id }).select('-_id -__v').lean();
      if (!cls) return res.json({ classes: [] });
      const student_count = await Student.countDocuments({ section_id: scopedSec.id });
      return res.json({
        classes: [{
          ...cls,
          sections_count: 1,
          student_count,
          scoped_section_id: scopedSec.id,
        }],
      });
    }
    const classes = await Class.find().select('-_id -__v').sort({ order: 1 }).lean();
    for (const cls of classes) {
      const sections = await Section.find({ class_id: cls.id }).select('-_id -__v').lean();
      cls.sections_count = sections.length;
      cls.student_count = await Student.countDocuments({ class_id: cls.id });
    }
    res.json({ classes });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can create classes' });
    const classId = randomUUID();
    const cls = await Class.create({ id: classId, name: req.body.name, order: isNaN(req.body.name) ? 0 : parseInt(req.body.name, 10), created_at: now() });
    res.json({ class: clean(cls) });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.get('/:classId', authenticate, async (req, res) => {
  try {
    const scopedSec = await getClassTeacherOnlySection(req.user);
    if (req.user.role === 'teacher' && scopedSec && req.params.classId !== scopedSec.class_id) {
      return res.status(403).json({ detail: 'You can only open your assigned class' });
    }
    const cls = await Class.findOne({ id: req.params.classId }).select('-_id -__v').lean();
    if (!cls) return res.status(404).json({ detail: 'Class not found' });
    let sections = await Section.find({ class_id: req.params.classId }).select('-_id -__v').lean();
    if (req.user.role === 'teacher' && scopedSec) {
      sections = sections.filter((s) => s.id === scopedSec.id);
    }
    for (const section of sections) {
      if (section.class_teacher_id) {
        section.class_teacher = await User.findOne({ id: section.class_teacher_id }).select('-_id -__v -password_hash').lean();
      } else { section.class_teacher = null; }
      section.student_count = await Student.countDocuments({ section_id: section.id });
    }
    cls.sections = sections;
    const subjects = await Subject.find({ class_id: req.params.classId }).select('-_id -__v').lean();
    for (const subject of subjects) {
      subject.teacher = subject.teacher_id ? await User.findOne({ id: subject.teacher_id }).select('-_id -__v -password_hash').lean() : null;
    }
    cls.subjects = subjects;
    cls.exams = await Exam.find({ class_id: req.params.classId }).select('-_id -__v').lean();
    res.json({ class: cls });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

module.exports = router;
