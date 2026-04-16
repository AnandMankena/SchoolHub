const express = require('express');
const { randomUUID } = require('crypto');
const { Student, Section, Class, Mark, Attendance, Subject, Exam } = require('../models');
const { authenticate } = require('../middleware/auth');
const { clean, now } = require('../utils/mongo');
const { getClassTeacherOnlySection, teacherCanAccessSection } = require('../services/teacherScope');
const { escapeRegex } = require('../utils/string');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const query = {};
    const scoped = await getClassTeacherOnlySection(req.user);
    if (req.user.role === 'teacher' && scoped) {
      if (req.query.section_id && req.query.section_id !== scoped.id) {
        return res.status(403).json({ detail: 'You can only list students in your class section' });
      }
      query.section_id = req.query.section_id || scoped.id;
    } else {
      if (req.query.section_id) query.section_id = req.query.section_id;
      if (req.query.class_id) query.class_id = req.query.class_id;
    }
    const rawSearch = (req.query.search || '').trim();
    if (rawSearch) {
      const re = new RegExp(escapeRegex(rawSearch), 'i');
      query.$or = [{ name: re }, { roll_number: re }];
    }
    const students = await Student.find(query).select('-_id -__v').sort({ roll_number: 1 }).lean();
    const sectionIds = [...new Set(students.map((s) => s.section_id).filter(Boolean))];
    const classIds = [...new Set(students.map((s) => s.class_id).filter(Boolean))];
    const [secs, clss] = await Promise.all([
      sectionIds.length ? Section.find({ id: { $in: sectionIds } }).select('id name').lean() : [],
      classIds.length ? Class.find({ id: { $in: classIds } }).select('id name').lean() : [],
    ]);
    const secMap = Object.fromEntries(secs.map((x) => [x.id, x.name]));
    const clsMap = Object.fromEntries(clss.map((x) => [x.id, x.name]));
    for (const s of students) {
      s.section_name = secMap[s.section_id] || '';
      s.class_name = clsMap[s.class_id] || '';
    }
    res.json({ students });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const section = await Section.findOne({ id: req.body.section_id }).select('-_id -__v').lean();
    if (!section) return res.status(404).json({ detail: 'Section not found' });
    if (req.user.role === 'teacher') {
      if (section.class_teacher_id !== req.user.id) {
        return res.status(403).json({ detail: 'Only your class section can receive new students' });
      }
    } else if (req.user.role !== 'principal') {
      return res.status(403).json({ detail: 'Not allowed' });
    }
    const student = await Student.create({ id: randomUUID(), name: req.body.name, roll_number: req.body.roll_number, section_id: req.body.section_id, class_id: section.class_id, created_at: now() });
    res.json({ student: clean(student) });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.put('/:studentId', authenticate, async (req, res) => {
  try {
    const student = await Student.findOne({ id: req.params.studentId }).select('-_id -__v').lean();
    if (!student) return res.status(404).json({ detail: 'Student not found' });
    if (req.user.role === 'teacher') {
      const sec = await Section.findOne({ id: student.section_id }).lean();
      if (!sec || sec.class_teacher_id !== req.user.id) {
        return res.status(403).json({ detail: 'You can only edit students in your class section' });
      }
    } else if (req.user.role !== 'principal') {
      return res.status(403).json({ detail: 'Not allowed' });
    }
    const update = {};
    if (req.body.name) update.name = req.body.name;
    if (req.body.roll_number) update.roll_number = req.body.roll_number;
    if (Object.keys(update).length) await Student.updateOne({ id: req.params.studentId }, { $set: update });
    const updated = await Student.findOne({ id: req.params.studentId }).select('-_id -__v').lean();
    res.json({ student: updated });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.delete('/:studentId', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      const student = await Student.findOne({ id: req.params.studentId }).lean();
      if (!student) return res.status(404).json({ detail: 'Student not found' });
      const sec = await Section.findOne({ id: student.section_id }).lean();
      if (!sec || sec.class_teacher_id !== req.user.id) {
        return res.status(403).json({ detail: 'You can only remove students from your class section' });
      }
    } else if (req.user.role !== 'principal') {
      return res.status(403).json({ detail: 'Not allowed' });
    }
    await Student.deleteOne({ id: req.params.studentId });
    await Mark.deleteMany({ student_id: req.params.studentId });
    await Attendance.deleteMany({ student_id: req.params.studentId });
    res.json({ message: 'Student deleted' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.get('/:studentId', authenticate, async (req, res) => {
  try {
    const student = await Student.findOne({ id: req.params.studentId }).select('-_id -__v').lean();
    if (!student) return res.status(404).json({ detail: 'Student not found' });
    if (req.user.role === 'teacher') {
      const ok = await teacherCanAccessSection(req.user, student.section_id);
      if (!ok) return res.status(403).json({ detail: 'No access to this student' });
    }
    const section = await Section.findOne({ id: student.section_id }).select('-_id -__v').lean();
    student.section_name = section ? section.name : 'Unknown';
    const cls = await Class.findOne({ id: student.class_id }).select('-_id -__v').lean();
    student.class_name = cls ? cls.name : 'Unknown';
    const marks = await Mark.find({ student_id: req.params.studentId }).select('-_id -__v').lean();
    for (const m of marks) {
      const subject = await Subject.findOne({ id: m.subject_id }).select('-_id -__v').lean();
      m.subject_name = subject ? subject.name : 'Unknown';
      const exam = await Exam.findOne({ id: m.exam_id }).select('-_id -__v').lean();
      m.exam_name = exam ? exam.name : 'Unknown';
      m.total_marks = exam ? exam.total_marks : 100;
    }
    student.marks = marks;
    student.attendance = await Attendance.find({ student_id: req.params.studentId }).select('-_id -__v').sort({ date: -1 }).limit(100).lean();
    res.json({ student });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

module.exports = router;
