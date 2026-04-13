require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// ============================================================
// Configuration
// ============================================================
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'principal@school.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'school_management';
const PORT = 8001;

const DEFAULT_SUBJECTS = ['Mathematics', 'English', 'Science', 'Hindi', 'Social Studies', 'Computer Science'];

// ============================================================
// Express + Socket.IO Setup
// ============================================================
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' }, path: '/api/socket.io' });

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// ============================================================
// MongoDB Connection + Models
// ============================================================
mongoose.connect(`${MONGO_URL}/${DB_NAME}`);
const db = mongoose.connection;
db.on('error', (err) => console.error('MongoDB error:', err));
db.once('open', () => {
  console.log('MongoDB connected');
  seedData();
});

const UserSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },
  email: { type: String, unique: true, index: true },
  password_hash: String,
  name: String,
  role: { type: String, enum: ['principal', 'teacher'] },
  is_approved: { type: Boolean, default: false },
  created_at: String,
});

const ClassSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },
  name: String,
  order: Number,
  created_at: String,
});

const SectionSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },
  class_id: { type: String, index: true },
  name: String,
  class_teacher_id: String,
  created_at: String,
});

const StudentSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },
  name: String,
  roll_number: String,
  section_id: { type: String, index: true },
  class_id: String,
  created_at: String,
});

const SubjectSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },
  name: String,
  class_id: { type: String, index: true },
  teacher_id: String,
  created_at: String,
});

const ExamSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },
  name: String,
  class_id: String,
  total_marks: { type: Number, default: 100 },
  created_at: String,
});

const MarkSchema = new mongoose.Schema({
  id: String,
  student_id: String,
  subject_id: String,
  exam_id: String,
  section_id: String,
  marks_obtained: Number,
  total_marks: Number,
  entered_by: String,
  updated_at: String,
});
MarkSchema.index({ student_id: 1, subject_id: 1, exam_id: 1 }, { unique: true });

const AttendanceSchema = new mongoose.Schema({
  id: String,
  student_id: String,
  section_id: String,
  date: String,
  status: String,
  marked_by: String,
  updated_at: String,
});
AttendanceSchema.index({ student_id: 1, date: 1 }, { unique: true });

const ChatGroupSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },
  name: String,
  created_by: String,
  members: [String],
  created_at: String,
});

const ChatMessageSchema = new mongoose.Schema({
  id: String,
  group_id: { type: String, index: true },
  sender_id: String,
  sender_name: String,
  message: String,
  created_at: String,
});

const User = mongoose.model('User', UserSchema);
const Class = mongoose.model('Class', ClassSchema);
const Section = mongoose.model('Section', SectionSchema);
const Student = mongoose.model('Student', StudentSchema);
const Subject = mongoose.model('Subject', SubjectSchema);
const Exam = mongoose.model('Exam', ExamSchema);
const Mark = mongoose.model('Mark', MarkSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);
const ChatGroup = mongoose.model('ChatGroup', ChatGroupSchema);
const ChatMessage = mongoose.model('ChatMessage', ChatMessageSchema);

// ============================================================
// Auth Middleware
// ============================================================
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  let token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.access_token;
  if (!token) return res.status(401).json({ detail: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type !== 'access') return res.status(401).json({ detail: 'Invalid token type' });
    const user = await User.findOne({ id: payload.sub }).select('-_id -__v -password_hash').lean();
    if (!user) return res.status(401).json({ detail: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ detail: 'Token expired' });
    return res.status(401).json({ detail: 'Invalid token' });
  }
};

const clean = (doc) => {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj._id;
  delete obj.__v;
  return obj;
};

const cleanMany = (docs) => docs.map(d => {
  const obj = d.toObject ? d.toObject() : { ...d };
  delete obj._id;
  delete obj.__v;
  return obj;
});

const now = () => new Date().toISOString();

// ============================================================
// Auth Routes
// ============================================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const emailLower = email.toLowerCase().trim();
    const existing = await User.findOne({ email: emailLower });
    if (existing) return res.status(400).json({ detail: 'Email already registered' });
    const userId = uuidv4();
    const hash = await bcrypt.hash(password, 10);
    await User.create({ id: userId, email: emailLower, password_hash: hash, name, role: 'teacher', is_approved: false, created_at: now() });
    res.json({ message: 'Registration successful. Please wait for principal approval.', user_id: userId });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
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

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// ============================================================
// Teacher Routes
// ============================================================
app.get('/api/teachers', authenticate, async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher' }).select('-_id -__v -password_hash').lean();
    res.json({ teachers });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.get('/api/teachers/pending', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can view pending teachers' });
    const teachers = await User.find({ role: 'teacher', is_approved: false }).select('-_id -__v -password_hash').lean();
    res.json({ teachers });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.get('/api/teachers/approved', authenticate, async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher', is_approved: true }).select('-_id -__v -password_hash').lean();
    res.json({ teachers });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.post('/api/teachers/:teacherId/approve', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can approve teachers' });
    const result = await User.updateOne({ id: req.params.teacherId, role: 'teacher' }, { $set: { is_approved: true } });
    if (result.modifiedCount === 0) return res.status(404).json({ detail: 'Teacher not found' });
    res.json({ message: 'Teacher approved successfully' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.post('/api/teachers/:teacherId/reject', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can reject teachers' });
    await User.deleteOne({ id: req.params.teacherId, role: 'teacher', is_approved: false });
    res.json({ message: 'Teacher rejected and removed' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.post('/api/teachers/create', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can create teachers' });
    const { name, email, password } = req.body;
    const emailLower = email.toLowerCase().trim();
    const existing = await User.findOne({ email: emailLower });
    if (existing) return res.status(400).json({ detail: 'Email already registered' });
    const teacherId = uuidv4();
    const hash = await bcrypt.hash(password, 10);
    const teacher = await User.create({ id: teacherId, email: emailLower, password_hash: hash, name, role: 'teacher', is_approved: true, created_at: now() });
    const t = clean(teacher);
    delete t.password_hash;
    res.json({ teacher: t });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.get('/api/teachers/my-data', authenticate, async (req, res) => {
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
    res.json({ subjects, class_teacher_section: classTeacherSection || null });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// ============================================================
// Class Routes
// ============================================================
app.get('/api/classes', authenticate, async (req, res) => {
  try {
    const classes = await Class.find().select('-_id -__v').sort({ order: 1 }).lean();
    for (const cls of classes) {
      const sections = await Section.find({ class_id: cls.id }).select('-_id -__v').lean();
      cls.sections_count = sections.length;
      cls.student_count = await Student.countDocuments({ class_id: cls.id });
    }
    res.json({ classes });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.post('/api/classes', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can create classes' });
    const classId = uuidv4();
    const cls = await Class.create({ id: classId, name: req.body.name, order: isNaN(req.body.name) ? 0 : parseInt(req.body.name), created_at: now() });
    res.json({ class: clean(cls) });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.get('/api/classes/:classId', authenticate, async (req, res) => {
  try {
    const cls = await Class.findOne({ id: req.params.classId }).select('-_id -__v').lean();
    if (!cls) return res.status(404).json({ detail: 'Class not found' });
    const sections = await Section.find({ class_id: req.params.classId }).select('-_id -__v').lean();
    for (const section of sections) {
      if (section.class_teacher_id) {
        section.class_teacher = await User.findOne({ id: section.class_teacher_id }).select('-_id -__v -password_hash').lean();
      } else { section.class_teacher = null; }
      section.student_count = await Student.countDocuments({ section_id: section.id });
    }
    cls.sections = sections;
    const subjects = await Subject.find({ class_id: req.params.classId }).select('-_id -__v').lean();
    for (const subject of subjects) {
      subject.teacher = subject.teacher_id ? await User.findOne({ id: subject.teacher_id }).select('-_id -__v -password_hash').lean() : null;
    }
    cls.subjects = subjects;
    cls.exams = await Exam.find({ class_id: req.params.classId }).select('-_id -__v').lean();
    res.json({ class: cls });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// ============================================================
// Section Routes
// ============================================================
app.post('/api/sections', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can create sections' });
    const section = await Section.create({ id: uuidv4(), class_id: req.body.class_id, name: req.body.name, class_teacher_id: req.body.class_teacher_id || null, created_at: now() });
    res.json({ section: clean(section) });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.put('/api/sections/:sectionId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can update sections' });
    const update = {};
    if (req.body.class_teacher_id !== undefined) update.class_teacher_id = req.body.class_teacher_id;
    if (Object.keys(update).length) await Section.updateOne({ id: req.params.sectionId }, { $set: update });
    const section = await Section.findOne({ id: req.params.sectionId }).select('-_id -__v').lean();
    res.json({ section });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.delete('/api/sections/:sectionId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can delete sections' });
    await Section.deleteOne({ id: req.params.sectionId });
    await Student.deleteMany({ section_id: req.params.sectionId });
    res.json({ message: 'Section deleted' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.get('/api/sections/:sectionId', authenticate, async (req, res) => {
  try {
    const section = await Section.findOne({ id: req.params.sectionId }).select('-_id -__v').lean();
    if (!section) return res.status(404).json({ detail: 'Section not found' });
    const cls = await Class.findOne({ id: section.class_id }).select('-_id -__v').lean();
    section.class_name = cls ? cls.name : 'Unknown';
    section.class_teacher = section.class_teacher_id ? await User.findOne({ id: section.class_teacher_id }).select('-_id -__v -password_hash').lean() : null;
    section.students = await Student.find({ section_id: req.params.sectionId }).select('-_id -__v').sort({ roll_number: 1 }).lean();
    const subjects = await Subject.find({ class_id: section.class_id }).select('-_id -__v').lean();
    for (const s of subjects) {
      s.teacher = s.teacher_id ? await User.findOne({ id: s.teacher_id }).select('-_id -__v -password_hash').lean() : null;
    }
    section.subjects = subjects;
    section.exams = await Exam.find({ class_id: section.class_id }).select('-_id -__v').lean();
    res.json({ section });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// ============================================================
// Subject Routes
// ============================================================
app.get('/api/subjects', authenticate, async (req, res) => {
  try {
    const query = {};
    if (req.query.class_id) query.class_id = req.query.class_id;
    const subjects = await Subject.find(query).select('-_id -__v').lean();
    for (const s of subjects) {
      s.teacher = s.teacher_id ? await User.findOne({ id: s.teacher_id }).select('-_id -__v -password_hash').lean() : null;
      const cls = await Class.findOne({ id: s.class_id }).select('-_id -__v').lean();
      s.class_name = cls ? cls.name : 'Unknown';
    }
    res.json({ subjects });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.post('/api/subjects', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') {
      const section = await Section.findOne({ class_teacher_id: req.user.id, class_id: req.body.class_id });
      if (!section) return res.status(403).json({ detail: 'Only principal or class teacher can add subjects' });
    }
    const subject = await Subject.create({ id: uuidv4(), name: req.body.name, class_id: req.body.class_id, teacher_id: req.body.teacher_id || null, created_at: now() });
    res.json({ subject: clean(subject) });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.put('/api/subjects/:subjectId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can assign teachers to subjects' });
    if (req.body.teacher_id !== undefined) await Subject.updateOne({ id: req.params.subjectId }, { $set: { teacher_id: req.body.teacher_id } });
    const subject = await Subject.findOne({ id: req.params.subjectId }).select('-_id -__v').lean();
    res.json({ subject });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.delete('/api/subjects/:subjectId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can delete subjects' });
    await Subject.deleteOne({ id: req.params.subjectId });
    res.json({ message: 'Subject deleted' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// ============================================================
// Student Routes
// ============================================================
app.get('/api/students', authenticate, async (req, res) => {
  try {
    const query = {};
    if (req.query.section_id) query.section_id = req.query.section_id;
    if (req.query.class_id) query.class_id = req.query.class_id;
    const students = await Student.find(query).select('-_id -__v').sort({ roll_number: 1 }).lean();
    res.json({ students });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.post('/api/students', authenticate, async (req, res) => {
  try {
    const section = await Section.findOne({ id: req.body.section_id }).select('-_id -__v').lean();
    if (!section) return res.status(404).json({ detail: 'Section not found' });
    const student = await Student.create({ id: uuidv4(), name: req.body.name, roll_number: req.body.roll_number, section_id: req.body.section_id, class_id: section.class_id, created_at: now() });
    res.json({ student: clean(student) });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.put('/api/students/:studentId', authenticate, async (req, res) => {
  try {
    const update = {};
    if (req.body.name) update.name = req.body.name;
    if (req.body.roll_number) update.roll_number = req.body.roll_number;
    if (Object.keys(update).length) await Student.updateOne({ id: req.params.studentId }, { $set: update });
    const student = await Student.findOne({ id: req.params.studentId }).select('-_id -__v').lean();
    res.json({ student });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.delete('/api/students/:studentId', authenticate, async (req, res) => {
  try {
    await Student.deleteOne({ id: req.params.studentId });
    await Mark.deleteMany({ student_id: req.params.studentId });
    await Attendance.deleteMany({ student_id: req.params.studentId });
    res.json({ message: 'Student deleted' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.get('/api/students/:studentId', authenticate, async (req, res) => {
  try {
    const student = await Student.findOne({ id: req.params.studentId }).select('-_id -__v').lean();
    if (!student) return res.status(404).json({ detail: 'Student not found' });
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

// ============================================================
// Exam Routes
// ============================================================
app.get('/api/exams', authenticate, async (req, res) => {
  try {
    const query = {};
    if (req.query.class_id) query.class_id = req.query.class_id;
    const exams = await Exam.find(query).select('-_id -__v').lean();
    res.json({ exams });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.post('/api/exams', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can create exams' });
    const exam = await Exam.create({ id: uuidv4(), name: req.body.name, class_id: req.body.class_id, total_marks: req.body.total_marks || 100, created_at: now() });
    res.json({ exam: clean(exam) });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.delete('/api/exams/:examId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'principal') return res.status(403).json({ detail: 'Only principal can delete exams' });
    await Exam.deleteOne({ id: req.params.examId });
    await Mark.deleteMany({ exam_id: req.params.examId });
    res.json({ message: 'Exam deleted' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// ============================================================
// Marks Routes
// ============================================================
app.post('/api/marks/enter', authenticate, async (req, res) => {
  try {
    const { exam_id, subject_id, section_id, marks } = req.body;
    const exam = await Exam.findOne({ id: exam_id }).lean();
    if (!exam) return res.status(404).json({ detail: 'Exam not found' });
    for (const entry of marks) {
      await Mark.updateOne(
        { student_id: entry.student_id, subject_id, exam_id },
        { $set: { id: uuidv4(), student_id: entry.student_id, subject_id, exam_id, section_id, marks_obtained: entry.marks_obtained, total_marks: exam.total_marks, entered_by: req.user.id, updated_at: now() } },
        { upsert: true }
      );
    }
    res.json({ message: `Marks entered for ${marks.length} students` });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.get('/api/marks', authenticate, async (req, res) => {
  try {
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

function calculateGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 40) return 'C';
  if (percentage >= 33) return 'D';
  return 'F';
}

app.get('/api/marks/rankings', authenticate, async (req, res) => {
  try {
    const { exam_id, section_id } = req.query;
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
    rankings.forEach((r, i) => r.rank = i + 1);
    res.json({ rankings, exam: { id: exam.id, name: exam.name, total_marks: exam.total_marks } });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// ============================================================
// Attendance Routes
// ============================================================
app.post('/api/attendance/mark', authenticate, async (req, res) => {
  try {
    const { section_id, date, attendance } = req.body;
    for (const entry of attendance) {
      await Attendance.updateOne(
        { student_id: entry.student_id, date },
        { $set: { id: uuidv4(), student_id: entry.student_id, section_id, date, status: entry.status, marked_by: req.user.id, updated_at: now() } },
        { upsert: true }
      );
    }
    res.json({ message: `Attendance marked for ${attendance.length} students` });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.get('/api/attendance', authenticate, async (req, res) => {
  try {
    const records = await Attendance.find({ section_id: req.query.section_id, date: req.query.date }).select('-_id -__v').lean();
    for (const r of records) {
      const student = await Student.findOne({ id: r.student_id }).select('-_id -__v').lean();
      r.student_name = student ? student.name : 'Unknown';
      r.roll_number = student ? student.roll_number : '';
    }
    res.json({ attendance: records });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// ============================================================
// Chat Routes
// ============================================================
app.get('/api/chat/groups', authenticate, async (req, res) => {
  try {
    const groups = await ChatGroup.find({ members: req.user.id }).select('-_id -__v').lean();
    for (const g of groups) {
      const lastMsg = await ChatMessage.find({ group_id: g.id }).select('-_id -__v').sort({ created_at: -1 }).limit(1).lean();
      g.last_message = lastMsg[0] || null;
      g.member_count = (g.members || []).length;
    }
    res.json({ groups });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.post('/api/chat/groups', authenticate, async (req, res) => {
  try {
    const members = [...new Set([req.user.id, ...(req.body.member_ids || [])])];
    const group = await ChatGroup.create({ id: uuidv4(), name: req.body.name, created_by: req.user.id, members, created_at: now() });
    res.json({ group: clean(group) });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.get('/api/chat/groups/:groupId', authenticate, async (req, res) => {
  try {
    const group = await ChatGroup.findOne({ id: req.params.groupId }).select('-_id -__v').lean();
    if (!group) return res.status(404).json({ detail: 'Group not found' });
    const membersData = [];
    for (const mid of group.members || []) {
      const u = await User.findOne({ id: mid }).select('-_id -__v -password_hash').lean();
      if (u) membersData.push(u);
    }
    group.members_data = membersData;
    res.json({ group });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.post('/api/chat/groups/:groupId/members', authenticate, async (req, res) => {
  try {
    const group = await ChatGroup.findOne({ id: req.params.groupId });
    if (!group) return res.status(404).json({ detail: 'Group not found' });
    if (!group.members.includes(req.user.id)) return res.status(403).json({ detail: 'You are not a member of this group' });
    await ChatGroup.updateOne({ id: req.params.groupId }, { $addToSet: { members: { $each: req.body.member_ids } } });
    res.json({ message: 'Members added' });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.get('/api/chat/groups/:groupId/messages', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const messages = await ChatMessage.find({ group_id: req.params.groupId }).select('-_id -__v').sort({ created_at: -1 }).limit(limit).lean();
    messages.reverse();
    res.json({ messages });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

app.post('/api/chat/groups/:groupId/messages', authenticate, async (req, res) => {
  try {
    const group = await ChatGroup.findOne({ id: req.params.groupId });
    if (!group) return res.status(404).json({ detail: 'Group not found' });
    const msg = { id: uuidv4(), group_id: req.params.groupId, sender_id: req.user.id, sender_name: req.user.name, message: req.body.message, created_at: now() };
    await ChatMessage.create(msg);
    io.to(req.params.groupId).emit('new_message', msg);
    res.json({ message: msg });
  } catch (err) { res.status(500).json({ detail: err.message }); }
});

// ============================================================
// Dashboard Routes
// ============================================================
app.get('/api/dashboard/stats', authenticate, async (req, res) => {
  try {
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

// ============================================================
// Socket.IO Events
// ============================================================
const sidUserMap = {};

io.on('connection', async (socket) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = await User.findOne({ id: payload.sub }).select('-_id -__v -password_hash').lean();
      if (user) {
        sidUserMap[socket.id] = user;
        console.log(`Socket connected: ${user.name} (${socket.id})`);
      }
    } catch (e) { console.error('Socket auth error:', e.message); }
  }

  socket.on('join_group', (data) => {
    const groupId = typeof data === 'string' ? data : data?.group_id;
    if (groupId) { socket.join(groupId); console.log(`Socket ${socket.id} joined room ${groupId}`); }
  });

  socket.on('send_message', async (data) => {
    const user = sidUserMap[socket.id];
    if (!user || !data?.group_id || !data?.message) return;
    const msg = { id: uuidv4(), group_id: data.group_id, sender_id: user.id, sender_name: user.name, message: data.message, created_at: now() };
    await ChatMessage.create(msg);
    io.to(data.group_id).emit('new_message', msg);
  });

  socket.on('leave_group', (data) => {
    const groupId = typeof data === 'string' ? data : data?.group_id;
    if (groupId) socket.leave(groupId);
  });

  socket.on('disconnect', () => {
    delete sidUserMap[socket.id];
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// ============================================================
// Data Seeding
// ============================================================
async function seedData() {
  try {
    // Seed principal
    let existing = await User.findOne({ email: ADMIN_EMAIL });
    if (!existing) {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await User.create({ id: uuidv4(), email: ADMIN_EMAIL, password_hash: hash, name: 'Principal', role: 'principal', is_approved: true, created_at: now() });
      console.log(`Principal account created: ${ADMIN_EMAIL}`);
    } else {
      const match = await bcrypt.compare(ADMIN_PASSWORD, existing.password_hash);
      if (!match) {
        const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
        await User.updateOne({ email: ADMIN_EMAIL }, { $set: { password_hash: hash } });
        console.log('Principal password updated');
      }
    }

    // Seed classes
    const classCount = await Class.countDocuments();
    if (classCount === 0) {
      for (let i = 1; i <= 10; i++) {
        const classId = uuidv4();
        await Class.create({ id: classId, name: String(i), order: i, created_at: now() });
        for (const sectionName of ['A', 'B', 'C']) {
          await Section.create({ id: uuidv4(), class_id: classId, name: sectionName, class_teacher_id: null, created_at: now() });
        }
        for (const subjectName of DEFAULT_SUBJECTS) {
          await Subject.create({ id: uuidv4(), name: subjectName, class_id: classId, teacher_id: null, created_at: now() });
        }
      }
      console.log('Seeded classes 1-10 with sections and subjects');
    }

    // Write test credentials
    const credsDir = path.join(__dirname, '..', 'memory');
    if (!fs.existsSync(credsDir)) fs.mkdirSync(credsDir, { recursive: true });
    fs.writeFileSync(path.join(credsDir, 'test_credentials.md'),
      `# Test Credentials\n\n## Principal (Admin)\n- Email: ${ADMIN_EMAIL}\n- Password: ${ADMIN_PASSWORD}\n- Role: principal\n\n## Auth Endpoints\n- POST /api/auth/login\n- POST /api/auth/register\n- GET /api/auth/me\n`
    );
    console.log('Data seeding complete');
  } catch (err) { console.error('Seeding error:', err); }
}

// ============================================================
// Start Server
// ============================================================
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Node.js Express server running on port ${PORT}`);
});
