const express = require('express');
const { Section } = require('../models');
const { authenticate } = require('../middleware/auth');
const { buildPrincipalAnalyticsPayload, buildClassTeacherAnalyticsPayload } = require('../services/analyticsService');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    if (req.user.role === 'principal') {
      return res.json(await buildPrincipalAnalyticsPayload(today));
    }
    if (req.user.role === 'teacher') {
      const homeroom = await Section.findOne({ class_teacher_id: req.user.id }).select('id class_id name').lean();
      if (!homeroom) {
        return res.status(403).json({ detail: 'Analytics are available to the principal, or to teachers assigned as class teacher of a section.' });
      }
      return res.json(await buildClassTeacherAnalyticsPayload(today, homeroom));
    }
    return res.status(403).json({ detail: 'Analytics are not available for this account.' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

module.exports = router;
