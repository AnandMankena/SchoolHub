const express = require('express');
const { Student, User, Class, Section } = require('../models');
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

module.exports = router;
