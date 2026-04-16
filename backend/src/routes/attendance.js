const express = require('express');
const { randomUUID } = require('crypto');
const { Attendance, Section, Student } = require('../models');
const { authenticate } = require('../middleware/auth');
const { now } = require('../utils/mongo');
const { teacherCanAccessSection } = require('../services/teacherScope');

const router = express.Router();

router.post('/mark', authenticate, async (req, res) => {
  try {
    const { section_id, date, attendance } = req.body;
    if (req.user.role !== 'principal') {
      const sec = await Section.findOne({ id: section_id }).lean();
      if (!sec || sec.class_teacher_id !== req.user.id) {
        return res.status(403).json({ detail: 'Only the class teacher (or principal) can mark attendance for this section' });
      }
    }
    for (const entry of attendance) {
      await Attendance.updateOne(
        { student_id: entry.student_id, date },
        { $set: { id: randomUUID(), student_id: entry.student_id, section_id, date, status: entry.status, marked_by: req.user.id, updated_at: now() } },
        { upsert: true }
      );
    }
    res.json({ message: `Attendance marked for ${attendance.length} students` });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.get('/', authenticate, async (req, res) => {
  try {
    if (req.query.section_id) {
      const ok = await teacherCanAccessSection(req.user, req.query.section_id);
      if (!ok) return res.status(403).json({ detail: 'No access to this section' });
    }
    const records = await Attendance.find({ section_id: req.query.section_id, date: req.query.date }).select('-_id -__v').lean();
    for (const r of records) {
      const student = await Student.findOne({ id: r.student_id }).select('-_id -__v').lean();
      r.student_name = student ? student.name : 'Unknown';
      r.roll_number = student ? student.roll_number : '';
    }
    res.json({ attendance: records });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

module.exports = router;
