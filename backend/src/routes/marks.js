const express = require('express');
const { randomUUID } = require('crypto');
const { Mark, Exam, Student, Subject, Section } = require('../models');
const { authenticate } = require('../middleware/auth');
const { now } = require('../utils/mongo');
const { teacherCanAccessSection } = require('../services/teacherScope');
const { calculateGrade } = require('../services/grades');

const router = express.Router();

router.post('/enter', authenticate, async (req, res) => {
  try {
    const { exam_id, subject_id, section_id, marks } = req.body;
    if (req.user.role !== 'principal') {
      const sub = await Subject.findOne({ id: subject_id }).lean();
      if (!sub || sub.teacher_id !== req.user.id) {
        return res.status(403).json({ detail: 'You can only enter marks for subjects you are assigned to teach' });
      }
      const ok = await teacherCanAccessSection(req.user, section_id);
      if (!ok) return res.status(403).json({ detail: 'No access to this section' });
    }
    const exam = await Exam.findOne({ id: exam_id }).lean();
    if (!exam) return res.status(404).json({ detail: 'Exam not found' });
    for (const entry of marks) {
      await Mark.updateOne(
        { student_id: entry.student_id, subject_id, exam_id },
        { $set: { id: randomUUID(), student_id: entry.student_id, subject_id, exam_id, section_id, marks_obtained: entry.marks_obtained, total_marks: exam.total_marks, entered_by: req.user.id, updated_at: now() } },
        { upsert: true }
      );
    }
    res.json({ message: `Marks entered for ${marks.length} students` });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.get('/rankings', authenticate, async (req, res) => {
  try {
    const { exam_id, section_id } = req.query;
    if (section_id) {
      const ok = await teacherCanAccessSection(req.user, section_id);
      if (!ok) return res.status(403).json({ detail: 'No access to this section' });
    }
    const students = await Student.find({ section_id }).select('-_id -__v').lean();
    const exam = await Exam.findOne({ id: exam_id }).lean();
    if (!exam) return res.status(404).json({ detail: 'Exam not found' });
    const section = await Section.findOne({ id: section_id }).lean();
    const subjects = await Subject.find({ class_id: section.class_id }).lean();
    const totalPossible = exam.total_marks * subjects.length;

    const rankings = [];
    for (const student of students) {
      const marks = await Mark.find({ student_id: student.id, exam_id }).select('-_id -__v').lean();
      const total = marks.reduce((sum, m) => sum + m.marks_obtained, 0);
      const percentage = totalPossible > 0 ? (total / totalPossible) * 100 : 0;
      const subjectMarks = [];
      for (const m of marks) {
        const subj = await Subject.findOne({ id: m.subject_id }).lean();
        subjectMarks.push({ subject_name: subj ? subj.name : 'Unknown', marks_obtained: m.marks_obtained, total_marks: m.total_marks });
      }
      rankings.push({
        student_id: student.id, student_name: student.name, roll_number: student.roll_number,
        total_marks: total, total_possible: totalPossible, percentage: Math.round(percentage * 100) / 100,
        grade: calculateGrade(percentage), subject_marks: subjectMarks,
      });
    }
    rankings.sort((a, b) => b.total_marks - a.total_marks);
    rankings.forEach((r, i) => { r.rank = i + 1; });
    res.json({ rankings, exam: { id: exam.id, name: exam.name, total_marks: exam.total_marks } });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.get('/', authenticate, async (req, res) => {
  try {
    if (req.query.section_id) {
      const ok = await teacherCanAccessSection(req.user, req.query.section_id);
      if (!ok) return res.status(403).json({ detail: 'No access to this section' });
    }
    const query = { exam_id: req.query.exam_id, section_id: req.query.section_id };
    if (req.query.subject_id) query.subject_id = req.query.subject_id;
    const marks = await Mark.find(query).select('-_id -__v').lean();
    for (const m of marks) {
      const student = await Student.findOne({ id: m.student_id }).select('-_id -__v').lean();
      m.student_name = student ? student.name : 'Unknown';
      m.roll_number = student ? student.roll_number : '';
      const subject = await Subject.findOne({ id: m.subject_id }).select('-_id -__v').lean();
      m.subject_name = subject ? subject.name : 'Unknown';
    }
    res.json({ marks });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

module.exports = router;
