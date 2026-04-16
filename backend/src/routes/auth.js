const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const { JWT_SECRET } = require('../config/env');
const { User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { clean, now } = require('../utils/mongo');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const emailLower = email.toLowerCase().trim();
    const existing = await User.findOne({ email: emailLower });
    if (existing) return res.status(400).json({ detail: 'Email already registered' });
    const userId = randomUUID();
    const hash = await bcrypt.hash(password, 10);
    await User.create({ id: userId, email: emailLower, password_hash: hash, name, role: 'teacher', is_approved: false, created_at: now() });
    res.json({ message: 'Registration successful. Please wait for principal approval.', user_id: userId });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailLower = email.toLowerCase().trim();
    const user = await User.findOne({ email: emailLower });
    if (!user) return res.status(401).json({ detail: 'Invalid email or password' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ detail: 'Invalid email or password' });
    if (user.role === 'teacher' && !user.is_approved) return res.status(403).json({ detail: 'Your account is pending approval by the principal' });
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role, type: 'access' }, JWT_SECRET, { expiresIn: '24h' });
    const userData = clean(user);
    delete userData.password_hash;
    res.json({ token, user: userData });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
