const express = require('express');
const { randomUUID } = require('crypto');
const { Subject, User, Class, Section } = require('../models');
const { authenticate } = require('../middleware/auth');
const { clean, now } = require('../utils/mongo');
const { getClassTeacherOnlySection } = require('../services/teacherScope');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const scoped = await getClassTeacherOnlySection(req.user);
    if (req.user.role === 'teacher' && scoped && req.query.class_id && req.query.class_id !== scoped.class_id) {
      return res.status(403).json({ detail: 'You can only view subjects for your assigned class' });
    }
    const query = {};
    if (req.query.class_id) query.class_id = req.query.class_id;
    const subjects = await Subject.find(query).select('-_id -__v').lean();
    for (const s of subjects) {
      s.teacher = s.teacher_id ? await User.findOne({ id: s.teacher_id }).select('-_id -__v -password_hash').lean() : null;
      const cls = await Class.findOne({ id: s.class_id }).select('-_id -__v').lean();
      s.class_name = cls ? cls.name : 'Unknown';
    }
    res.json({ subjects });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') {
      const section = await Section.findOne({ class_teacher_id: req.user.id, class_id: req.body.class_id });
      if (!section) return res.status(403).json({ detail: 'Only principal or class teacher can add subjects' });
    }
    const subject = await Subject.create({ id: randomUUID(), name: req.body.name, class_id: req.body.class_id, teacher_id: req.body.teacher_id || null, created_at: now() });
    res.json({ subject: clean(subject) });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.put('/:subjectId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can assign teachers to subjects' });
    if (req.body.teacher_id !== undefined) await Subject.updateOne({ id: req.params.subjectId }, { $set: { teacher_id: req.body.teacher_id } });
    const subject = await Subject.findOne({ id: req.params.subjectId }).select('-_id -__v').lean();
    res.json({ subject });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.delete('/:subjectId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can delete subjects' });
    await Subject.deleteOne({ id: req.params.subjectId });
    res.json({ message: 'Subject deleted' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

module.exports = router;
