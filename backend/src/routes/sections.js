const express = require('express');
const { randomUUID } = require('crypto');
const { Section, Student, Class, User, Subject, Exam } = require('../models');
const { authenticate } = require('../middleware/auth');
const { clean, now } = require('../utils/mongo');
const { teacherCanAccessSection } = require('../services/teacherScope');

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can create sections' });
    const section = await Section.create({ id: randomUUID(), class_id: req.body.class_id, name: req.body.name, class_teacher_id: req.body.class_teacher_id || null, created_at: now() });
    res.json({ section: clean(section) });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.put('/:sectionId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can update sections' });
    const update = {};
    if (req.body.class_teacher_id !== undefined) update.class_teacher_id = req.body.class_teacher_id;
    if (Object.keys(update).length) await Section.updateOne({ id: req.params.sectionId }, { $set: update });
    const section = await Section.findOne({ id: req.params.sectionId }).select('-_id -__v').lean();
    res.json({ section });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.delete('/:sectionId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can delete sections' });
    await Section.deleteOne({ id: req.params.sectionId });
    await Student.deleteMany({ section_id: req.params.sectionId });
    res.json({ message: 'Section deleted' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.get('/:sectionId', authenticate, async (req, res) => {
  try {
    const can = await teacherCanAccessSection(req.user, req.params.sectionId);
    if (!can) return res.status(403).json({ detail: 'You do not have access to this section' });
    const section = await Section.findOne({ id: req.params.sectionId }).select('-_id -__v').lean();
    if (!section) return res.status(404).json({ detail: 'Section not found' });
    const cls = await Class.findOne({ id: section.class_id }).select('-_id -__v').lean();
    section.class_name = cls ? cls.name : 'Unknown';
    section.class_teacher = section.class_teacher_id ? await User.findOne({ id: section.class_teacher_id }).select('-_id -__v -password_hash').lean() : null;
    section.students = await Student.find({ section_id: req.params.sectionId }).select('-_id -__v').sort({ roll_number: 1 }).lean();
    const subjects = await Subject.find({ class_id: section.class_id }).select('-_id -__v').lean();
    for (const s of subjects) {
      s.teacher = s.teacher_id ? await User.findOne({ id: s.teacher_id }).select('-_id -__v -password_hash').lean() : null;
    }
    section.subjects = subjects;
    section.exams = await Exam.find({ class_id: section.class_id }).select('-_id -__v').lean();
    res.json({ section });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

module.exports = router;
