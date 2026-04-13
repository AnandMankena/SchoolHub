# SchoolHub - School Management System PRD

## Overview
A comprehensive school management system built with Expo (React Native) for mobile and web, FastAPI backend, and MongoDB database.

## Technology Stack
- **Frontend:** Expo SDK 54, React Native, expo-router
- **Backend:** FastAPI (Python), Socket.IO for real-time chat
- **Database:** MongoDB
- **Auth:** JWT-based custom authentication with bcrypt

## User Roles
1. **Principal** - Full admin access, manages teachers, views all school data
2. **Teacher** - Subject teacher, enters marks, takes attendance; can also be Class Teacher

## Core Features

### Authentication
- JWT-based email/password auth
- Self-registration with principal approval workflow
- Pre-seeded principal account
- Manual teacher creation by principal

### School Structure
- Classes 1-10 pre-seeded
- Configurable sections (A, B, C...) per class
- Class teacher assignment per section
- Subject teacher assignment per subject

### Student Management
- CRUD operations for students
- Assign to sections
- Student profiles with marks and attendance

### Marks & Grading
- Multiple exam types (Midterm, Finals, etc.)
- Marks entry per subject per section
- Auto grade calculation (A+ to F)
- Class ranking (1st, 2nd, 3rd...)

### Attendance
- Daily attendance marking per section
- Toggle between Present/Absent/Late
- Attendance history per student

### Real-time Chat
- Group chat creation (anyone can create)
- Member management
- HTTP-based messaging with 3s polling for near real-time
- Socket.IO integration for true real-time on supported platforms

## Screens
1. Login/Register
2. Dashboard (Principal/Teacher views)
3. Classes List
4. Class Detail (Sections, Subjects, Exams)
5. Section Detail (Students, Actions)
6. Marks Entry
7. Attendance
8. Chat Groups List
9. Chat Room
10. Create Group
11. Manage Teachers
12. Student Detail / Rankings
13. Profile

## API Endpoints
- `/api/auth/*` - Authentication
- `/api/teachers/*` - Teacher management
- `/api/classes/*` - Class operations
- `/api/sections/*` - Section CRUD
- `/api/subjects/*` - Subject management
- `/api/students/*` - Student CRUD
- `/api/exams/*` - Exam management
- `/api/marks/*` - Marks entry and rankings
- `/api/attendance/*` - Attendance tracking
- `/api/chat/*` - Chat groups and messages
- `/api/dashboard/*` - Dashboard stats

## Default Data
- 10 classes (1-10), each with 3 sections (A, B, C)
- 6 default subjects per class: Mathematics, English, Science, Hindi, Social Studies, Computer Science
- Principal account pre-seeded
