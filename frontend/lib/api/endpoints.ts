/**
 * Central API path constants — use with `apiCall()` from `utils/api`.
 * Keeps routes in one place when the backend is modularized.
 */
export const ApiPaths = {
  health: '/api/health',
  authLogin: '/api/auth/login',
  authRegister: '/api/auth/register',
  authMe: '/api/auth/me',
  teachers: '/api/teachers',
  teachersPending: '/api/teachers/pending',
  teachersApproved: '/api/teachers/approved',
  teachersCreate: '/api/teachers/create',
  teachersMyData: '/api/teachers/my-data',
  teachersMyClassAnalytics: '/api/teachers/my-class-analytics',
  classes: '/api/classes',
  sections: (id: string) => `/api/sections/${id}`,
  students: '/api/students',
  student: (id: string) => `/api/students/${id}`,
  subjects: '/api/subjects',
  exams: '/api/exams',
  marks: '/api/marks',
  marksEnter: '/api/marks/enter',
  marksRankings: '/api/marks/rankings',
  attendance: '/api/attendance',
  attendanceMark: '/api/attendance/mark',
  chatGroups: '/api/chat/groups',
  chatDm: '/api/chat/dm',
  chatGroup: (id: string) => `/api/chat/groups/${id}`,
  chatMessages: (groupId: string) => `/api/chat/groups/${groupId}/messages`,
  dashboardStats: '/api/dashboard/stats',
  analytics: '/api/analytics',
} as const;
