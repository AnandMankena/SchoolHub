const express = require('express');
const { randomUUID } = require('crypto');
const { Exam, Mark } = require('../models');
const { authenticate } = require('../middleware/auth');
const { clean, now } = require('../utils/mongo');
const { getClassTeacherOnlySection } = require('../services/teacherScope');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const scoped = await getClassTeacherOnlySection(req.user);
    if (req.user.role === 'teacher' && scoped && req.query.class_id && req.query.class_id !== scoped.class_id) {
      return res.status(403).json({ detail: 'You can only view exams for your assigned class' });
    }
    const query = {};
    if (req.query.class_id) query.class_id = req.query.class_id;
    const exams = await Exam.find(query).select('-_id -__v').lean();
    res.json({ exams });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can create exams' });
    const exam = await Exam.create({ id: randomUUID(), name: req.body.name, class_id: req.body.class_id, total_marks: req.body.total_marks || 100, created_at: now() });
    res.json({ exam: clean(exam) });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.delete('/:examId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can delete exams' });
    await Exam.deleteOne({ id: req.params.examId });
    await Mark.deleteMany({ exam_id: req.params.examId });
    res.json({ message: 'Exam deleted' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

module.exports = router;
