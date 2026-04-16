const express = require('express');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { User, Class, Section, Subject } = require('../models');
const { authenticate } = require('../middleware/auth');
const { clean, now } = require('../utils/mongo');
const { getClassTeacherOnlySection } = require('../services/teacherScope');
const { buildClassTeacherAnalyticsPayload } = require('../services/analyticsService');
const { escapeRegex } = require('../utils/string');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { search, class_id, approved_only } = req.query;
    const q = { role: 'teacher' };
    if (approved_only === '1' || approved_only === 'true') q.is_approved = true;
    if (approved_only === '0' || approved_only === 'false') q.is_approved = false;

    let teachers = await User.find(q).select('-_id -__v -password_hash').sort({ name: 1 }).lean();

    if (class_id) {
      const subTeacherIds = await Subject.distinct('teacher_id', { class_id, teacher_id: { $nin: [null, ''] } });
      const allow = new Set(subTeacherIds);
      teachers = teachers.filter((t) => allow.has(t.id));
    }

    const rawSearch = (search || '').trim();
    if (rawSearch) {
      const re = new RegExp(escapeRegex(rawSearch), 'i');
      teachers = teachers.filter((t) => re.test(t.name || '') || re.test(t.email || ''));
    }

    const teacherIds = teachers.map((t) => t.id);
    const allSubs = teacherIds.length
      ? await Subject.find({ teacher_id: { $in: teacherIds } }).select('name class_id teacher_id').lean()
      : [];
    const clsIds = [...new Set(allSubs.map((s) => s.class_id).filter(Boolean))];
    const clss = clsIds.length ? await Class.find({ id: { $in: clsIds } }).select('id name').lean() : [];
    const clsMap = Object.fromEntries(clss.map((c) => [c.id, c.name]));
    const byTid = {};
    for (const s of allSubs) {
      if (!byTid[s.teacher_id]) byTid[s.teacher_id] = [];
      if (byTid[s.teacher_id].length < 8) {
        byTid[s.teacher_id].push({ name: s.name, class_name: clsMap[s.class_id] || '?' });
      }
    }
    for (const t of teachers) {
      t.subjects_preview = byTid[t.id] || [];
    }

    res.json({ teachers });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.get('/pending', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can view pending teachers' });
    const teachers = await User.find({ role: 'teacher', is_approved: false }).select('-_id -__v -password_hash').lean();
    res.json({ teachers });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.get('/approved', authenticate, async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher', is_approved: true }).select('-_id -__v -password_hash').lean();
    res.json({ teachers });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.post('/create', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can create teachers' });
    const { name, email, password } = req.body;
    const emailLower = email.toLowerCase().trim();
    const existing = await User.findOne({ email: emailLower });
    if (existing) return res.status(400).json({ detail: 'Email already registered' });
    const teacherId = randomUUID();
    const hash = await bcrypt.hash(password, 10);
    const teacher = await User.create({ id: teacherId, email: emailLower, password_hash: hash, name, role: 'teacher', is_approved: true, created_at: now() });
    const t = clean(teacher);
    delete t.password_hash;
    res.json({ teacher: t });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.get('/my-data', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ detail: 'Only teachers can access this' });
    const subjects = await Subject.find({ teacher_id: req.user.id }).select('-_id -__v').lean();
    for (const s of subjects) {
      const cls = await Class.findOne({ id: s.class_id }).select('-_id -__v').lean();
      s.class_name = cls ? cls.name : 'Unknown';
    }
    let classTeacherSection = await Section.findOne({ class_teacher_id: req.user.id }).select('-_id -__v').lean();
    if (classTeacherSection) {
      const cls = await Class.findOne({ id: classTeacherSection.class_id }).select('-_id -__v').lean();
      classTeacherSection.class_name = cls ? cls.name : 'Unknown';
    }
    const scoped = await getClassTeacherOnlySection(req.user);
    res.json({
      subjects,
      class_teacher_section: classTeacherSection || null,
      class_teacher_only: !!scoped,
    });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.get('/my-class-analytics', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ detail: 'Class analytics are only available to teacher accounts.' });
    }
    const homeroom = await Section.findOne({ class_teacher_id: req.user.id }).select('id class_id name').lean();
    if (!homeroom) {
      return res.status(403).json({
        detail: 'You need to be assigned as the class teacher of a section (ask your principal). Then you can see analytics for that class only.',
      });
    }
    const today = new Date().toISOString().split('T')[0];
    return res.json(await buildClassTeacherAnalyticsPayload(today, homeroom));
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.post('/:teacherId/approve', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can approve teachers' });
    const result = await User.updateOne({ id: req.params.teacherId, role: 'teacher' }, { $set: { is_approved: true } });
    if (result.modifiedCount === 0) return res.status(404).json({ detail: 'Teacher not found' });
    res.json({ message: 'Teacher approved successfully' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.post('/:teacherId/reject', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can reject teachers' });
    await User.deleteOne({ id: req.params.teacherId, role: 'teacher', is_approved: false });
    res.json({ message: 'Teacher rejected and removed' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

module.exports = router;
