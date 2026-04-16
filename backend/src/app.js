const express = require('express');
const cors = require('cors');
const { backendRoot } = require('./config/paths');

function createApp() {
  const app = express();
  app.use(cors({ origin: '*', credentials: true }));
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      service: 'schoolhub-backend',
      layout: 'modular (src/)',
      backendRoot,
      cwd: process.cwd(),
      hint: 'If routes 404, stop other processes on the API port and run `npm start` from SchoolHub/backend.',
    });
  });

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/teachers', require('./routes/teachers'));
  app.use('/api/classes', require('./routes/classes'));
  app.use('/api/sections', require('./routes/sections'));
  app.use('/api/subjects', require('./routes/subjects'));
  app.use('/api/students', require('./routes/students'));
  app.use('/api/exams', require('./routes/exams'));
  app.use('/api/marks', require('./routes/marks'));
  app.use('/api/attendance', require('./routes/attendance'));
  app.use('/api/chat', require('./routes/chat'));
  app.use('/api/dashboard', require('./routes/dashboard'));
  app.use('/api/analytics', require('./routes/analytics'));

  return app;
}

module.exports = { createApp };
