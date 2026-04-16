const mongoose = require('mongoose');

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
  /** `direct` = one-to-one between two staff; use direct_pair_key for idempotent lookup */
  kind: { type: String, enum: ['group', 'direct'], default: 'group' },
  direct_pair_key: { type: String, unique: true, sparse: true, index: true },
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

const AppMetaSchema = new mongoose.Schema({ key: { type: String, unique: true }, value: String });

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
const AppMeta = mongoose.model('AppMeta', AppMetaSchema);

module.exports = {
  User,
  Class,
  Section,
  Student,
  Subject,
  Exam,
  Mark,
  Attendance,
  ChatGroup,
  ChatMessage,
  AppMeta,
};
