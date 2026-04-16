require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

function read(name, fallback = undefined) {
  const v = process.env[name];
  if (v != null && String(v).trim() !== '') return String(v).trim();
  return fallback;
}

const JWT_SECRET = read('JWT_SECRET');
const MONGO_URL = read('MONGO_URL');

if (isProd && (!JWT_SECRET || !MONGO_URL)) {
  console.error('FATAL (production): JWT_SECRET and MONGO_URL must be set in environment.');
  process.exit(1);
}

if (!JWT_SECRET || !MONGO_URL) {
  console.warn('WARN: JWT_SECRET or MONGO_URL missing — set backend/.env for local development.');
}

module.exports = {
  isProd,
  JWT_SECRET: JWT_SECRET || 'dev-insecure-change-me',
  MONGO_URL: MONGO_URL || 'mongodb://127.0.0.1:27017',
  DB_NAME: read('DB_NAME', 'school_management'),
  PORT: parseInt(read('PORT', '8001'), 10) || 8001,
  ADMIN_EMAIL: read('ADMIN_EMAIL', 'principal@school.com'),
  ADMIN_PASSWORD: read('ADMIN_PASSWORD', 'Admin@123'),
  DEFAULT_SUBJECTS: ['Mathematics', 'English', 'Science', 'Hindi', 'Social Studies', 'Computer Science'],
};
