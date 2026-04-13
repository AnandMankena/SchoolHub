user_problem_statement: "Build a school management website and mobile application with teacher login, principal login, class management, marks entry, attendance tracking, and real-time group chat"

backend:
  - task: "Auth - Login/Register/Me"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Auth endpoints working - login, register, me"

  - task: "Teacher Management - CRUD/Approve/Reject"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Teacher management endpoints implemented"

  - task: "Classes and Sections CRUD"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Classes seeded 1-10 with sections A,B,C"

  - task: "Students CRUD"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Student CRUD endpoints"

  - task: "Marks Entry and Rankings"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Marks entry with auto grade calculation and rankings"

  - task: "Attendance"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Attendance marking and retrieval"

  - task: "Chat Groups and Messages"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Chat group CRUD, messaging via HTTP, Socket.IO for real-time"

  - task: "Dashboard Stats"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Dashboard stats endpoint"

frontend:
  - task: "Login/Register Screen"
    implemented: true
    working: true
    file: "frontend/app/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Login screen visible and working"

  - task: "Principal Dashboard"
    implemented: true
    working: "NA"
    file: "frontend/app/(tabs)/dashboard.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Needs testing after login"

  - task: "Classes List Screen"
    implemented: true
    working: "NA"
    file: "frontend/app/(tabs)/classes.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Needs testing"

  - task: "Chat Screen"
    implemented: true
    working: "NA"
    file: "frontend/app/(tabs)/chat.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Needs testing"

  - task: "Class Detail Screen"
    implemented: true
    working: "NA"
    file: "frontend/app/class-detail.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Needs testing"

  - task: "Section Detail Screen"
    implemented: true
    working: "NA"
    file: "frontend/app/section-detail.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Needs testing"

  - task: "Marks Entry Screen"
    implemented: true
    working: "NA"
    file: "frontend/app/marks-entry.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Needs testing"

  - task: "Manage Teachers Screen"
    implemented: true
    working: "NA"
    file: "frontend/app/manage-teachers.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Needs testing"

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: true

test_plan:
  current_focus:
    - "Auth - Login/Register"
    - "Principal Dashboard"
    - "Classes navigation"
    - "Teacher Management"
    - "Chat functionality"
  stuck_tasks: []
  test_all: true
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Full school management system implemented. Backend has auth, teacher management, classes, sections, students, marks, attendance, chat APIs. Frontend has login, dashboard, classes, chat, profile, class-detail, section-detail, marks-entry, chat-room, manage-teachers, attendance, create-group, and student-detail screens. Principal can login with principal@school.com / Admin@123. Data seeded with 10 classes, 3 sections each, 6 default subjects."
