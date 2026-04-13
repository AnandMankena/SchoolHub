from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import socketio
import os
import logging
import bcrypt
import jwt as pyjwt
import uuid
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from typing import List, Optional
from contextlib import asynccontextmanager

# ============================================================
# Configuration
# ============================================================
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "principal@school.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@123")

mongo_url = os.environ['MONGO_URL']
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ.get('DB_NAME', 'school_management')]

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============================================================
# Socket.IO Setup
# ============================================================
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
sid_user_map = {}

# ============================================================
# Password & JWT Utilities
# ============================================================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "type": "access"
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============================================================
# Pydantic Models
# ============================================================
class RegisterInput(BaseModel):
    name: str
    email: str
    password: str

class LoginInput(BaseModel):
    email: str
    password: str

class CreateTeacherInput(BaseModel):
    name: str
    email: str
    password: str

class CreateClassInput(BaseModel):
    name: str

class CreateSectionInput(BaseModel):
    class_id: str
    name: str
    class_teacher_id: Optional[str] = None

class UpdateSectionInput(BaseModel):
    class_teacher_id: Optional[str] = None

class CreateStudentInput(BaseModel):
    name: str
    roll_number: str
    section_id: str

class UpdateStudentInput(BaseModel):
    name: Optional[str] = None
    roll_number: Optional[str] = None

class CreateSubjectInput(BaseModel):
    name: str
    class_id: str
    teacher_id: Optional[str] = None

class UpdateSubjectInput(BaseModel):
    teacher_id: Optional[str] = None

class CreateExamInput(BaseModel):
    name: str
    class_id: str
    total_marks: int = 100

class MarkEntry(BaseModel):
    student_id: str
    marks_obtained: float

class EnterMarksInput(BaseModel):
    exam_id: str
    subject_id: str
    section_id: str
    marks: List[MarkEntry]

class AttendanceEntry(BaseModel):
    student_id: str
    status: str

class MarkAttendanceInput(BaseModel):
    section_id: str
    date: str
    attendance: List[AttendanceEntry]

class CreateGroupInput(BaseModel):
    name: str
    member_ids: List[str] = []

class AddMembersInput(BaseModel):
    member_ids: List[str]

class SendMessageInput(BaseModel):
    message: str

# ============================================================
# App Setup
# ============================================================
@asynccontextmanager
async def lifespan(app):
    await seed_data()
    await create_indexes()
    yield
    mongo_client.close()

fastapi_app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")

# ============================================================
# Auth Routes
# ============================================================
@api_router.post("/auth/register")
async def register(input: RegisterInput):
    email = input.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(input.password),
        "name": input.name,
        "role": "teacher",
        "is_approved": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    return {"message": "Registration successful. Please wait for principal approval.", "user_id": user_id}

@api_router.post("/auth/login")
async def login(input: LoginInput):
    email = input.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(input.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user["role"] == "teacher" and not user.get("is_approved", False):
        raise HTTPException(status_code=403, detail="Your account is pending approval by the principal")
    token = create_access_token(user["id"], user["email"], user["role"])
    user_data = {k: v for k, v in user.items() if k not in ("_id", "password_hash")}
    return {"token": token, "user": user_data}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {"user": user}

# ============================================================
# Teacher Management Routes
# ============================================================
@api_router.get("/teachers")
async def get_teachers(user: dict = Depends(get_current_user)):
    teachers = await db.users.find({"role": "teacher"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return {"teachers": teachers}

@api_router.get("/teachers/pending")
async def get_pending_teachers(user: dict = Depends(get_current_user)):
    if user["role"] != "principal":
        raise HTTPException(status_code=403, detail="Only principal can view pending teachers")
    teachers = await db.users.find({"role": "teacher", "is_approved": False}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return {"teachers": teachers}

@api_router.get("/teachers/approved")
async def get_approved_teachers(user: dict = Depends(get_current_user)):
    teachers = await db.users.find({"role": "teacher", "is_approved": True}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return {"teachers": teachers}

@api_router.post("/teachers/{teacher_id}/approve")
async def approve_teacher(teacher_id: str, user: dict = Depends(get_current_user)):
    if user["role"] != "principal":
        raise HTTPException(status_code=403, detail="Only principal can approve teachers")
    result = await db.users.update_one({"id": teacher_id, "role": "teacher"}, {"$set": {"is_approved": True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return {"message": "Teacher approved successfully"}

@api_router.post("/teachers/{teacher_id}/reject")
async def reject_teacher(teacher_id: str, user: dict = Depends(get_current_user)):
    if user["role"] != "principal":
        raise HTTPException(status_code=403, detail="Only principal can reject teachers")
    await db.users.delete_one({"id": teacher_id, "role": "teacher", "is_approved": False})
    return {"message": "Teacher rejected and removed"}

@api_router.post("/teachers/create")
async def create_teacher(input: CreateTeacherInput, user: dict = Depends(get_current_user)):
    if user["role"] != "principal":
        raise HTTPException(status_code=403, detail="Only principal can create teachers")
    email = input.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    teacher_id = str(uuid.uuid4())
    teacher = {
        "id": teacher_id,
        "email": email,
        "password_hash": hash_password(input.password),
        "name": input.name,
        "role": "teacher",
        "is_approved": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(teacher)
    teacher.pop("_id", None)
    teacher.pop("password_hash", None)
    return {"teacher": teacher}

@api_router.get("/teachers/my-data")
async def get_my_teacher_data(user: dict = Depends(get_current_user)):
    if user["role"] != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can access this")
    subjects = await db.subjects.find({"teacher_id": user["id"]}, {"_id": 0}).to_list(100)
    for s in subjects:
        cls = await db.classes.find_one({"id": s["class_id"]}, {"_id": 0})
        s["class_name"] = cls["name"] if cls else "Unknown"
    class_teacher_section = await db.sections.find_one({"class_teacher_id": user["id"]}, {"_id": 0})
    if class_teacher_section:
        cls = await db.classes.find_one({"id": class_teacher_section["class_id"]}, {"_id": 0})
        class_teacher_section["class_name"] = cls["name"] if cls else "Unknown"
    return {"subjects": subjects, "class_teacher_section": class_teacher_section}

# ============================================================
# Class Routes
# ============================================================
@api_router.get("/classes")
async def get_classes(user: dict = Depends(get_current_user)):
    classes = await db.classes.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    for cls in classes:
        sections = await db.sections.find({"class_id": cls["id"]}, {"_id": 0}).to_list(100)
        cls["sections_count"] = len(sections)
        student_count = await db.students.count_documents({"class_id": cls["id"]})
        cls["student_count"] = student_count
    return {"classes": classes}

@api_router.post("/classes")
async def create_class(input: CreateClassInput, user: dict = Depends(get_current_user)):
    if user["role"] != "principal":
        raise HTTPException(status_code=403, detail="Only principal can create classes")
    class_id = str(uuid.uuid4())
    cls = {
        "id": class_id,
        "name": input.name,
        "order": int(input.name) if input.name.isdigit() else 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.classes.insert_one(cls)
    cls.pop("_id", None)
    return {"class": cls}

@api_router.get("/classes/{class_id}")
async def get_class_detail(class_id: str, user: dict = Depends(get_current_user)):
    cls = await db.classes.find_one({"id": class_id}, {"_id": 0})
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    sections = await db.sections.find({"class_id": class_id}, {"_id": 0}).to_list(100)
    for section in sections:
        if section.get("class_teacher_id"):
            teacher = await db.users.find_one({"id": section["class_teacher_id"]}, {"_id": 0, "password_hash": 0})
            section["class_teacher"] = teacher
        else:
            section["class_teacher"] = None
        section["student_count"] = await db.students.count_documents({"section_id": section["id"]})
    cls["sections"] = sections
    subjects = await db.subjects.find({"class_id": class_id}, {"_id": 0}).to_list(100)
    for subject in subjects:
        if subject.get("teacher_id"):
            teacher = await db.users.find_one({"id": subject["teacher_id"]}, {"_id": 0, "password_hash": 0})
            subject["teacher"] = teacher
        else:
            subject["teacher"] = None
    cls["subjects"] = subjects
    exams = await db.exams.find({"class_id": class_id}, {"_id": 0}).to_list(100)
    cls["exams"] = exams
    return {"class": cls}

# ============================================================
# Section Routes
# ============================================================
@api_router.post("/sections")
async def create_section(input: CreateSectionInput, user: dict = Depends(get_current_user)):
    if user["role"] != "principal":
        raise HTTPException(status_code=403, detail="Only principal can create sections")
    section_id = str(uuid.uuid4())
    section = {
        "id": section_id,
        "class_id": input.class_id,
        "name": input.name,
        "class_teacher_id": input.class_teacher_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sections.insert_one(section)
    section.pop("_id", None)
    return {"section": section}

@api_router.put("/sections/{section_id}")
async def update_section(section_id: str, input: UpdateSectionInput, user: dict = Depends(get_current_user)):
    if user["role"] != "principal":
        raise HTTPException(status_code=403, detail="Only principal can update sections")
    update = {}
    if input.class_teacher_id is not None:
        update["class_teacher_id"] = input.class_teacher_id
    if update:
        await db.sections.update_one({"id": section_id}, {"$set": update})
    section = await db.sections.find_one({"id": section_id}, {"_id": 0})
    return {"section": section}

@api_router.delete("/sections/{section_id}")
async def delete_section(section_id: str, user: dict = Depends(get_current_user)):
    if user["role"] != "principal":
        raise HTTPException(status_code=403, detail="Only principal can delete sections")
    await db.sections.delete_one({"id": section_id})
    await db.students.delete_many({"section_id": section_id})
    return {"message": "Section deleted"}

@api_router.get("/sections/{section_id}")
async def get_section_detail(section_id: str, user: dict = Depends(get_current_user)):
    section = await db.sections.find_one({"id": section_id}, {"_id": 0})
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    cls = await db.classes.find_one({"id": section["class_id"]}, {"_id": 0})
    section["class_name"] = cls["name"] if cls else "Unknown"
    if section.get("class_teacher_id"):
        teacher = await db.users.find_one({"id": section["class_teacher_id"]}, {"_id": 0, "password_hash": 0})
        section["class_teacher"] = teacher
    else:
        section["class_teacher"] = None
    students = await db.students.find({"section_id": section_id}, {"_id": 0}).sort("roll_number", 1).to_list(1000)
    section["students"] = students
    subjects = await db.subjects.find({"class_id": section["class_id"]}, {"_id": 0}).to_list(100)
    for s in subjects:
        if s.get("teacher_id"):
            t = await db.users.find_one({"id": s["teacher_id"]}, {"_id": 0, "password_hash": 0})
            s["teacher"] = t
        else:
            s["teacher"] = None
    section["subjects"] = subjects
    exams = await db.exams.find({"class_id": section["class_id"]}, {"_id": 0}).to_list(100)
    section["exams"] = exams
    return {"section": section}

# ============================================================
# Subject Routes
# ============================================================
@api_router.get("/subjects")
async def get_subjects(class_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if class_id:
        query["class_id"] = class_id
    subjects = await db.subjects.find(query, {"_id": 0}).to_list(1000)
    for s in subjects:
        if s.get("teacher_id"):
            t = await db.users.find_one({"id": s["teacher_id"]}, {"_id": 0, "password_hash": 0})
            s["teacher"] = t
        else:
            s["teacher"] = None
        cls = await db.classes.find_one({"id": s["class_id"]}, {"_id": 0})
        s["class_name"] = cls["name"] if cls else "Unknown"
    return {"subjects": subjects}

@api_router.post("/subjects")
async def create_subject(input: CreateSubjectInput, user: dict = Depends(get_current_user)):
    if user["role"] not in ["principal"]:
        section = await db.sections.find_one({"class_teacher_id": user["id"], "class_id": input.class_id})
        if not section:
            raise HTTPException(status_code=403, detail="Only principal or class teacher can add subjects")
    subject_id = str(uuid.uuid4())
    subject = {
        "id": subject_id,
        "name": input.name,
        "class_id": input.class_id,
        "teacher_id": input.teacher_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.subjects.insert_one(subject)
    subject.pop("_id", None)
    return {"subject": subject}

@api_router.put("/subjects/{subject_id}")
async def update_subject(subject_id: str, input: UpdateSubjectInput, user: dict = Depends(get_current_user)):
    if user["role"] != "principal":
        raise HTTPException(status_code=403, detail="Only principal can assign teachers to subjects")
    update = {}
    if input.teacher_id is not None:
        update["teacher_id"] = input.teacher_id
    if update:
        await db.subjects.update_one({"id": subject_id}, {"$set": update})
    subject = await db.subjects.find_one({"id": subject_id}, {"_id": 0})
    return {"subject": subject}

@api_router.delete("/subjects/{subject_id}")
async def delete_subject(subject_id: str, user: dict = Depends(get_current_user)):
    if user["role"] != "principal":
        raise HTTPException(status_code=403, detail="Only principal can delete subjects")
    await db.subjects.delete_one({"id": subject_id})
    return {"message": "Subject deleted"}

# ============================================================
# Student Routes
# ============================================================
@api_router.get("/students")
async def get_students(section_id: Optional[str] = None, class_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if section_id:
        query["section_id"] = section_id
    if class_id:
        query["class_id"] = class_id
    students = await db.students.find(query, {"_id": 0}).sort("roll_number", 1).to_list(1000)
    return {"students": students}

@api_router.post("/students")
async def create_student(input: CreateStudentInput, user: dict = Depends(get_current_user)):
    section = await db.sections.find_one({"id": input.section_id}, {"_id": 0})
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    student_id = str(uuid.uuid4())
    student = {
        "id": student_id,
        "name": input.name,
        "roll_number": input.roll_number,
        "section_id": input.section_id,
        "class_id": section["class_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.students.insert_one(student)
    student.pop("_id", None)
    return {"student": student}

@api_router.put("/students/{student_id}")
async def update_student(student_id: str, input: UpdateStudentInput, user: dict = Depends(get_current_user)):
    update = {}
    if input.name is not None:
        update["name"] = input.name
    if input.roll_number is not None:
        update["roll_number"] = input.roll_number
    if update:
        await db.students.update_one({"id": student_id}, {"$set": update})
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    return {"student": student}

@api_router.delete("/students/{student_id}")
async def delete_student(student_id: str, user: dict = Depends(get_current_user)):
    await db.students.delete_one({"id": student_id})
    await db.marks.delete_many({"student_id": student_id})
    await db.attendance.delete_many({"student_id": student_id})
    return {"message": "Student deleted"}

@api_router.get("/students/{student_id}")
async def get_student_detail(student_id: str, user: dict = Depends(get_current_user)):
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    section = await db.sections.find_one({"id": student["section_id"]}, {"_id": 0})
    student["section_name"] = section["name"] if section else "Unknown"
    cls = await db.classes.find_one({"id": student["class_id"]}, {"_id": 0})
    student["class_name"] = cls["name"] if cls else "Unknown"
    marks = await db.marks.find({"student_id": student_id}, {"_id": 0}).to_list(1000)
    for m in marks:
        subject = await db.subjects.find_one({"id": m["subject_id"]}, {"_id": 0})
        m["subject_name"] = subject["name"] if subject else "Unknown"
        exam = await db.exams.find_one({"id": m["exam_id"]}, {"_id": 0})
        m["exam_name"] = exam["name"] if exam else "Unknown"
        m["total_marks"] = exam["total_marks"] if exam else 100
    student["marks"] = marks
    attendance_records = await db.attendance.find({"student_id": student_id}, {"_id": 0}).sort("date", -1).to_list(100)
    student["attendance"] = attendance_records
    return {"student": student}

# ============================================================
# Exam Routes
# ============================================================
@api_router.get("/exams")
async def get_exams(class_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if class_id:
        query["class_id"] = class_id
    exams = await db.exams.find(query, {"_id": 0}).to_list(100)
    return {"exams": exams}

@api_router.post("/exams")
async def create_exam(input: CreateExamInput, user: dict = Depends(get_current_user)):
    if user["role"] != "principal":
        raise HTTPException(status_code=403, detail="Only principal can create exams")
    exam_id = str(uuid.uuid4())
    exam = {
        "id": exam_id,
        "name": input.name,
        "class_id": input.class_id,
        "total_marks": input.total_marks,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.exams.insert_one(exam)
    exam.pop("_id", None)
    return {"exam": exam}

@api_router.delete("/exams/{exam_id}")
async def delete_exam(exam_id: str, user: dict = Depends(get_current_user)):
    if user["role"] != "principal":
        raise HTTPException(status_code=403, detail="Only principal can delete exams")
    await db.exams.delete_one({"id": exam_id})
    await db.marks.delete_many({"exam_id": exam_id})
    return {"message": "Exam deleted"}

# ============================================================
# Marks Routes
# ============================================================
@api_router.post("/marks/enter")
async def enter_marks(input: EnterMarksInput, user: dict = Depends(get_current_user)):
    exam = await db.exams.find_one({"id": input.exam_id}, {"_id": 0})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    for entry in input.marks:
        await db.marks.update_one(
            {"student_id": entry.student_id, "subject_id": input.subject_id, "exam_id": input.exam_id},
            {"$set": {
                "id": str(uuid.uuid4()),
                "student_id": entry.student_id,
                "subject_id": input.subject_id,
                "exam_id": input.exam_id,
                "section_id": input.section_id,
                "marks_obtained": entry.marks_obtained,
                "total_marks": exam["total_marks"],
                "entered_by": user["id"],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
    return {"message": f"Marks entered for {len(input.marks)} students"}

@api_router.get("/marks")
async def get_marks(exam_id: str, section_id: str, subject_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"exam_id": exam_id, "section_id": section_id}
    if subject_id:
        query["subject_id"] = subject_id
    marks = await db.marks.find(query, {"_id": 0}).to_list(10000)
    for m in marks:
        student = await db.students.find_one({"id": m["student_id"]}, {"_id": 0})
        m["student_name"] = student["name"] if student else "Unknown"
        m["roll_number"] = student["roll_number"] if student else ""
        subject = await db.subjects.find_one({"id": m["subject_id"]}, {"_id": 0})
        m["subject_name"] = subject["name"] if subject else "Unknown"
    return {"marks": marks}

@api_router.get("/marks/rankings")
async def get_rankings(exam_id: str, section_id: str, user: dict = Depends(get_current_user)):
    students = await db.students.find({"section_id": section_id}, {"_id": 0}).to_list(1000)
    exam = await db.exams.find_one({"id": exam_id}, {"_id": 0})
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    section = await db.sections.find_one({"id": section_id}, {"_id": 0})
    subjects = await db.subjects.find({"class_id": section["class_id"]}, {"_id": 0}).to_list(100)
    total_possible = exam["total_marks"] * len(subjects)
    rankings = []
    for student in students:
        marks = await db.marks.find({"student_id": student["id"], "exam_id": exam_id}, {"_id": 0}).to_list(100)
        total = sum(m["marks_obtained"] for m in marks)
        percentage = (total / total_possible * 100) if total_possible > 0 else 0
        grade = calculate_grade(percentage)
        subject_marks = []
        for m in marks:
            subj = await db.subjects.find_one({"id": m["subject_id"]}, {"_id": 0})
            subject_marks.append({
                "subject_name": subj["name"] if subj else "Unknown",
                "marks_obtained": m["marks_obtained"],
                "total_marks": m["total_marks"]
            })
        rankings.append({
            "student_id": student["id"],
            "student_name": student["name"],
            "roll_number": student["roll_number"],
            "total_marks": total,
            "total_possible": total_possible,
            "percentage": round(percentage, 2),
            "grade": grade,
            "subject_marks": subject_marks
        })
    rankings.sort(key=lambda x: x["total_marks"], reverse=True)
    for i, r in enumerate(rankings):
        r["rank"] = i + 1
    return {"rankings": rankings, "exam": exam}

def calculate_grade(percentage: float) -> str:
    if percentage >= 90: return "A+"
    if percentage >= 80: return "A"
    if percentage >= 70: return "B+"
    if percentage >= 60: return "B"
    if percentage >= 50: return "C+"
    if percentage >= 40: return "C"
    if percentage >= 33: return "D"
    return "F"

# ============================================================
# Attendance Routes
# ============================================================
@api_router.post("/attendance/mark")
async def mark_attendance(input: MarkAttendanceInput, user: dict = Depends(get_current_user)):
    for entry in input.attendance:
        await db.attendance.update_one(
            {"student_id": entry.student_id, "date": input.date},
            {"$set": {
                "id": str(uuid.uuid4()),
                "student_id": entry.student_id,
                "section_id": input.section_id,
                "date": input.date,
                "status": entry.status,
                "marked_by": user["id"],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
    return {"message": f"Attendance marked for {len(input.attendance)} students"}

@api_router.get("/attendance")
async def get_attendance(section_id: str, date: str, user: dict = Depends(get_current_user)):
    records = await db.attendance.find({"section_id": section_id, "date": date}, {"_id": 0}).to_list(1000)
    for r in records:
        student = await db.students.find_one({"id": r["student_id"]}, {"_id": 0})
        r["student_name"] = student["name"] if student else "Unknown"
        r["roll_number"] = student["roll_number"] if student else ""
    return {"attendance": records}

# ============================================================
# Chat Routes
# ============================================================
@api_router.get("/chat/groups")
async def get_chat_groups(user: dict = Depends(get_current_user)):
    groups = await db.chat_groups.find({"members": user["id"]}, {"_id": 0}).to_list(100)
    for g in groups:
        last_msg = await db.chat_messages.find({"group_id": g["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1)
        g["last_message"] = last_msg[0] if last_msg else None
        g["member_count"] = len(g.get("members", []))
    return {"groups": groups}

@api_router.post("/chat/groups")
async def create_chat_group(input: CreateGroupInput, user: dict = Depends(get_current_user)):
    group_id = str(uuid.uuid4())
    members = list(set([user["id"]] + input.member_ids))
    group = {
        "id": group_id,
        "name": input.name,
        "created_by": user["id"],
        "members": members,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_groups.insert_one(group)
    group.pop("_id", None)
    return {"group": group}

@api_router.get("/chat/groups/{group_id}")
async def get_chat_group(group_id: str, user: dict = Depends(get_current_user)):
    group = await db.chat_groups.find_one({"id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    members_data = []
    for mid in group.get("members", []):
        u = await db.users.find_one({"id": mid}, {"_id": 0, "password_hash": 0})
        if u:
            members_data.append(u)
    group["members_data"] = members_data
    return {"group": group}

@api_router.post("/chat/groups/{group_id}/members")
async def add_members(group_id: str, input: AddMembersInput, user: dict = Depends(get_current_user)):
    group = await db.chat_groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if user["id"] not in group.get("members", []):
        raise HTTPException(status_code=403, detail="You are not a member of this group")
    await db.chat_groups.update_one(
        {"id": group_id},
        {"$addToSet": {"members": {"$each": input.member_ids}}}
    )
    return {"message": "Members added"}

@api_router.get("/chat/groups/{group_id}/messages")
async def get_messages(group_id: str, limit: int = 50, user: dict = Depends(get_current_user)):
    messages = await db.chat_messages.find({"group_id": group_id}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    messages.reverse()
    return {"messages": messages}

@api_router.post("/chat/groups/{group_id}/messages")
async def send_message_http(group_id: str, input: SendMessageInput, user: dict = Depends(get_current_user)):
    group = await db.chat_groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    msg = {
        "id": str(uuid.uuid4()),
        "group_id": group_id,
        "sender_id": user["id"],
        "sender_name": user["name"],
        "message": input.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(msg)
    msg.pop("_id", None)
    await sio.emit('new_message', msg, room=group_id)
    return {"message": msg}

# ============================================================
# Dashboard Routes
# ============================================================
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    total_students = await db.students.count_documents({})
    total_teachers = await db.users.count_documents({"role": "teacher", "is_approved": True})
    total_classes = await db.classes.count_documents({})
    pending_approvals = await db.users.count_documents({"role": "teacher", "is_approved": False})
    total_sections = await db.sections.count_documents({})
    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_classes": total_classes,
        "pending_approvals": pending_approvals,
        "total_sections": total_sections
    }

# ============================================================
# Socket.IO Events
# ============================================================
@sio.event
async def connect(sid, environ, auth):
    if auth and auth.get('token'):
        try:
            payload = pyjwt.decode(auth['token'], JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
            if user:
                sid_user_map[sid] = user
                logger.info(f"Socket connected: {user['name']} ({sid})")
                return True
        except Exception as e:
            logger.error(f"Socket auth error: {e}")
    return True

@sio.event
async def join_group(sid, data):
    group_id = data.get('group_id') if isinstance(data, dict) else data
    if group_id:
        sio.enter_room(sid, group_id)
        logger.info(f"Socket {sid} joined room {group_id}")

@sio.event
async def send_message(sid, data):
    user = sid_user_map.get(sid)
    if not user:
        return
    group_id = data.get('group_id')
    message_text = data.get('message')
    if not group_id or not message_text:
        return
    msg = {
        "id": str(uuid.uuid4()),
        "group_id": group_id,
        "sender_id": user["id"],
        "sender_name": user["name"],
        "message": message_text,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(msg)
    msg.pop("_id", None)
    await sio.emit('new_message', msg, room=group_id)

@sio.event
async def leave_group(sid, data):
    group_id = data.get('group_id') if isinstance(data, dict) else data
    if group_id:
        sio.leave_room(sid, group_id)

@sio.event
async def disconnect(sid):
    sid_user_map.pop(sid, None)
    logger.info(f"Socket disconnected: {sid}")

# ============================================================
# Middleware & Router
# ============================================================
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

fastapi_app.include_router(api_router)

# Combined ASGI App (Socket.IO + FastAPI)
app = socketio.ASGIApp(sio, fastapi_app, socketio_path='api/socket.io')

# ============================================================
# Data Seeding
# ============================================================
DEFAULT_SUBJECTS = ["Mathematics", "English", "Science", "Hindi", "Social Studies", "Computer Science"]

async def seed_data():
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        principal_id = str(uuid.uuid4())
        await db.users.insert_one({
            "id": principal_id,
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Principal",
            "role": "principal",
            "is_approved": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Principal account created: {ADMIN_EMAIL}")
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}}
        )
        logger.info("Principal password updated")

    existing_classes = await db.classes.count_documents({})
    if existing_classes == 0:
        for i in range(1, 11):
            class_id = str(uuid.uuid4())
            await db.classes.insert_one({
                "id": class_id,
                "name": str(i),
                "order": i,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            for section_name in ["A", "B", "C"]:
                await db.sections.insert_one({
                    "id": str(uuid.uuid4()),
                    "class_id": class_id,
                    "name": section_name,
                    "class_teacher_id": None,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
            for subject_name in DEFAULT_SUBJECTS:
                await db.subjects.insert_one({
                    "id": str(uuid.uuid4()),
                    "name": subject_name,
                    "class_id": class_id,
                    "teacher_id": None,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
        logger.info("Seeded classes 1-10 with sections and subjects")

    # Write test credentials
    creds_path = Path("/app/memory/test_credentials.md")
    creds_path.parent.mkdir(parents=True, exist_ok=True)
    creds_path.write_text(
        f"# Test Credentials\n\n"
        f"## Principal (Admin)\n"
        f"- Email: {ADMIN_EMAIL}\n"
        f"- Password: {ADMIN_PASSWORD}\n"
        f"- Role: principal\n\n"
        f"## Auth Endpoints\n"
        f"- POST /api/auth/login\n"
        f"- POST /api/auth/register\n"
        f"- GET /api/auth/me\n"
    )

async def create_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.classes.create_index("id", unique=True)
    await db.sections.create_index("id", unique=True)
    await db.sections.create_index("class_id")
    await db.students.create_index("id", unique=True)
    await db.students.create_index("section_id")
    await db.subjects.create_index("id", unique=True)
    await db.subjects.create_index("class_id")
    await db.exams.create_index("id", unique=True)
    await db.marks.create_index([("student_id", 1), ("subject_id", 1), ("exam_id", 1)], unique=True)
    await db.attendance.create_index([("student_id", 1), ("date", 1)], unique=True)
    await db.chat_groups.create_index("id", unique=True)
    await db.chat_messages.create_index("group_id")
    logger.info("Database indexes created")
