import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import 'dotenv/config';

import { ConfigService } from './services/ConfigService';

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = new Hono();

// ===== CORS: Allow all origins in development, specific in production =====
const getAllowedOrigins = () => {
  if (NODE_ENV === 'production') {
    return process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  }
  // Development: allow any origin for phone/laptop same-network access
  return ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://0.0.0.0:3000'];
};

app.use('*', cors({
  origin: (origin) => {
    // In development, allow any origin (including phones on same network)
    if (NODE_ENV === 'development') return origin || '*';
    const allowed = getAllowedOrigins();
    return allowed.includes(origin) ? origin : allowed[0];
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ===== Pre-seeded Users (Instructors and Admins) =====
// These are preloaded into the system and do not need attendance marking

export interface PreseededUser {
  id: string;
  vid: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  role: 'admin' | 'instructor' | 'assessment_admin' | 'volunteer';
  unit: string;
  designation: string;
  gender: string;
  isVerified: boolean;
  status: 'active' | 'pending' | 'inactive';
  isActive: boolean;
  attendance?: number;
  createdAt: string;
}

const PRESEEDED_USERS: PreseededUser[] = [
  {
    id: 'adm-001',
    vid: 'VK-2025-0001',
    firstName: 'Air Cmde',
    lastName: 'Sathe',
    fullName: 'Air Cmde Nitin Sathe',
    email: 'admin@vkumbh.org',
    mobileNumber: '9876543200',
    role: 'admin',
    unit: 'CHMES HQ',
    designation: 'Training Director',
    gender: 'male',
    isVerified: true,
    status: 'active',
    isActive: true,
    attendance: 100,
    createdAt: '2025-03-01T00:00:00Z',
  },
  {
    id: 'inst-001',
    vid: 'VK-2025-2001',
    firstName: 'Gp Capt',
    lastName: 'Kulkarni',
    fullName: 'Gp Capt Mahesh Kulkarni',
    email: 'instructor1@vkumbh.org',
    mobileNumber: '9876543201',
    role: 'instructor',
    unit: 'CHMES Training Wing',
    designation: 'Lead Instructor',
    gender: 'male',
    isVerified: true,
    status: 'active',
    isActive: true,
    attendance: 100,
    createdAt: '2025-03-01T00:00:00Z',
  },
  {
    id: 'inst-002',
    vid: 'VK-2025-2002',
    firstName: 'Dr.',
    lastName: 'Joshi',
    fullName: 'Dr. Prachi Joshi',
    email: 'instructor2@vkumbh.org',
    mobileNumber: '9876543202',
    role: 'instructor',
    unit: 'DES PU',
    designation: 'Disaster Management Expert',
    gender: 'female',
    isVerified: true,
    status: 'active',
    isActive: true,
    attendance: 98,
    createdAt: '2025-03-01T00:00:00Z',
  },
  {
    id: 'inst-003',
    vid: 'VK-2025-2003',
    firstName: 'Wg Cdr',
    lastName: 'Patel',
    fullName: 'Wg Cdr Rajesh Patel',
    email: 'instructor3@vkumbh.org',
    mobileNumber: '9876543203',
    role: 'instructor',
    unit: 'CHMES Training Wing',
    designation: 'Crowd Control Specialist',
    gender: 'male',
    isVerified: true,
    status: 'active',
    isActive: true,
    attendance: 96,
    createdAt: '2025-03-01T00:00:00Z',
  },
  {
    id: 'asm-001',
    vid: 'VK-2025-3001',
    firstName: 'Dr.',
    lastName: 'Verma',
    fullName: 'Dr. Anjali Verma',
    email: 'assessment@vkumbh.org',
    mobileNumber: '9876543204',
    role: 'assessment_admin',
    unit: 'DES PU',
    designation: 'Assessment Coordinator',
    gender: 'female',
    isVerified: true,
    status: 'active',
    isActive: true,
    attendance: 100,
    createdAt: '2025-03-01T00:00:00Z',
  },
];

// Build a lookup map for preseeded users
const preseededUsersMap = new Map<string, PreseededUser>();
for (const u of PRESEEDED_USERS) {
  preseededUsersMap.set(u.id, u);
  preseededUsersMap.set(u.mobileNumber, u);
}

// Roles that do NOT need attendance marking
const NO_ATTENDANCE_ROLES: string[] = ['admin'];

// ===== In-memory data stores =====
const attendanceStore: any[] = [];
const qrStore: any[] = [];
const userStore: PreseededUser[] = [...PRESEEDED_USERS]; // Start with preseeded users
const certificateStore: any[] = [
  { id: 'cert-001', userId: 'vol-001', certificateNumber: 'VK-2025-CERT-0001', eventId: 'event-001', eventName: 'VKumbh 2025 Training', volunteerName: 'Rahul Sharma', issueDate: '2025-04-15', validUntil: '2026-04-15', status: 'issued', type: 'Completion', grade: 'A', score: 85, issuedAt: new Date('2025-04-15').toISOString() },
  { id: 'cert-002', userId: 'vol-001', certificateNumber: 'VK-2025-CERT-0002', eventId: 'event-001', eventName: 'VKumbh 2025 Training', volunteerName: 'Rahul Sharma', issueDate: '2025-04-10', validUntil: '2026-04-10', status: 'issued', type: 'Participation', grade: 'B', score: 72, issuedAt: new Date('2025-04-10').toISOString() },
];
const examAttemptsStore: any[] = [
  { id: 'attempt-001', examId: 'exam-001', userId: 'vol-001', userName: 'Rahul Sharma', score: 4, totalQuestions: 5, percentage: 80, isPassed: true, submittedAt: '2025-04-05T10:30:00Z' },
  { id: 'attempt-002', examId: 'exam-001', userId: 'usr-004', userName: 'Priya Patel', score: 3, totalQuestions: 5, percentage: 60, isPassed: false, submittedAt: '2025-04-05T11:00:00Z' },
  { id: 'attempt-003', examId: 'exam-002', userId: 'vol-001', userName: 'Rahul Sharma', score: 8, totalQuestions: 10, percentage: 80, isPassed: true, submittedAt: '2025-04-12T14:00:00Z' },
];

const sessionsData = [
  { id: 's-001', eventId: 'event-001', name: 'Morning: Behavioral Modification I', slot: 'morning', date: '2025-04-01', venue: 'Hall A', capacity: 200, enrolled: 187, attended: 172, instructor: 'Gp Capt Kulkarni', status: 'completed', timeStart: '09:00', timeEnd: '12:00' },
  { id: 's-002', eventId: 'event-001', name: 'Afternoon: Behavioral Modification II', slot: 'afternoon', date: '2025-04-01', venue: 'Hall B', capacity: 150, enrolled: 143, attended: 138, instructor: 'Dr. Joshi', status: 'completed', timeStart: '14:00', timeEnd: '17:00' },
  { id: 's-003', eventId: 'event-001', name: 'Full Day: Disaster Management & First Aid', slot: 'full_day', date: '2025-04-02', venue: 'Hall A', capacity: 200, enrolled: 195, attended: 189, instructor: 'Air Cmde Sathe', status: 'completed', timeStart: '09:00', timeEnd: '17:00' },
  { id: 's-004', eventId: 'event-001', name: 'Morning: Crowd Control Techniques', slot: 'morning', date: '2025-04-03', venue: 'Training Ground', capacity: 250, enrolled: 230, attended: 218, instructor: 'Gp Capt Kulkarni', status: 'in_progress', timeStart: '09:00', timeEnd: '12:00' },
  { id: 's-005', eventId: 'event-001', name: 'Afternoon: Communication Protocols', slot: 'afternoon', date: '2025-04-03', venue: 'Hall C', capacity: 180, enrolled: 165, attended: 0, instructor: 'Dr. Joshi', status: 'scheduled', timeStart: '14:00', timeEnd: '17:00' },
  { id: 's-006', eventId: 'event-001', name: 'Emergency Response Simulation', slot: 'morning', date: '2025-04-04', venue: 'Field Area', capacity: 300, enrolled: 280, attended: 0, instructor: 'Air Cmde Sathe', status: 'scheduled', timeStart: '09:00', timeEnd: '12:00' },
  { id: 's-007', eventId: 'event-001', name: 'Review & Assessment Prep', slot: 'afternoon', date: '2025-04-04', venue: 'Hall A', capacity: 200, enrolled: 190, attended: 0, instructor: 'Gp Capt Kulkarni', status: 'scheduled', timeStart: '14:00', timeEnd: '16:00' },
];

const daywiseSchedule = [
  { date: '2025-04-01', day: 1, sessions: ['s-001', 's-002'], hasExam: true, examType: 'pre_test', examId: 'exam-001' },
  { date: '2025-04-02', day: 2, sessions: ['s-003'], hasExam: false, examType: '', examId: '' },
  { date: '2025-04-03', day: 3, sessions: ['s-004', 's-005'], hasExam: false, examType: '', examId: '' },
  { date: '2025-04-04', day: 4, sessions: ['s-006', 's-007'], hasExam: true, examType: 'post_test', examId: 'exam-002' },
  { date: '2025-04-05', day: 5, sessions: [], hasExam: false, examType: '', examId: '' },
];

// ===== Helper: Build token =====
function buildToken(user: any): string {
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    role: user.role,
    name: user.fullName || `${user.firstName} ${user.lastName}`,
    firstName: user.firstName,
    lastName: user.lastName,
    vid: user.vid,
  })).toString('base64');
  return `demo_token_${payload}`;
}

// ===== Helper: Parse token =====
function parseToken(token: string): any {
  if (!token.startsWith('demo_token_')) return null;
  try {
    const payload = token.slice('demo_token_'.length);
    return JSON.parse(Buffer.from(payload, 'base64').toString());
  } catch {
    return null;
  }
}

// ===== Health Check =====
app.get('/health', (c) => c.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '1.0.0',
  env: NODE_ENV,
}));

// ===== Auth API =====
app.post('/api/auth/otp/request', async (c) => {
  const body = await c.req.json();
  return c.json({ requestId: crypto.randomUUID(), expiresIn: 600, message: `OTP sent to ${body.phone}` });
});

app.post('/api/auth/otp/verify', async (c) => {
  const body = await c.req.json();
  const phone = body.phone || '9876543210';
  const role = body.role || 'volunteer';

  // Check if this is a preseeded user by phone
  const preseeded = preseededUsersMap.get(phone);

  if (preseeded) {
    const token = buildToken(preseeded);
    return c.json({
      user: { ...preseeded, name: preseeded.fullName, photoUrl: null, avatar: null },
      token,
      message: 'Login successful (preseeded user)',
    });
  }

  // Check OTP
  const isValid = body.otp === '123456';
  if (!isValid) {
    return c.json({ error: 'Invalid OTP' }, 401);
  }

  // Create a volunteer user
  const roleProfiles: Record<string, any> = {
    volunteer: { id: `vol-${crypto.randomUUID().slice(0, 8)}`, vid: `VK-2025-1${Math.floor(Math.random() * 9000) + 1000}`, firstName: 'Rahul', lastName: 'Sharma', fullName: 'Rahul Sharma', email: 'volunteer@vkumbh.org', unit: 'Unit A', designation: 'Volunteer', gender: 'male' },
    instructor: { id: `inst-${crypto.randomUUID().slice(0, 8)}`, vid: `VK-2025-2${Math.floor(Math.random() * 9000) + 1000}`, firstName: 'New', lastName: 'Instructor', fullName: 'New Instructor', email: 'newinstructor@vkumbh.org', unit: 'CHMES Training Wing', designation: 'Instructor', gender: 'male' },
    admin: { id: `adm-${crypto.randomUUID().slice(0, 8)}`, vid: `VK-2025-0${Math.floor(Math.random() * 900) + 100}`, firstName: 'New', lastName: 'Admin', fullName: 'New Admin', email: 'newadmin@vkumbh.org', unit: 'CHMES HQ', designation: 'Admin', gender: 'male' },
    assessment_admin: { id: `asm-${crypto.randomUUID().slice(0, 8)}`, vid: `VK-2025-3${Math.floor(Math.random() * 9000) + 1000}`, firstName: 'New', lastName: 'Assessment', fullName: 'New Assessment Admin', email: 'newassessment@vkumbh.org', unit: 'DES PU', designation: 'Assessment Coordinator', gender: 'female' },
  };

  const profile = roleProfiles[role] || roleProfiles.volunteer;
  const newUser: PreseededUser = {
    ...profile,
    mobileNumber: phone,
    role,
    isVerified: true,
    status: 'active',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  userStore.push(newUser);
  preseededUsersMap.set(phone, newUser);
  preseededUsersMap.set(profile.id, newUser);

  const token = buildToken(newUser);
  return c.json({
    user: { ...newUser, name: newUser.fullName, avatar: null, photoUrl: null },
    token,
    message: 'Login successful',
  });
});

app.get('/api/auth/me', async (c) => {
  const auth = c.req.header('authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  const token = auth.slice(7);
  try {
    const payload = parseToken(token);
    if (!payload) return c.json({ error: 'Invalid token' }, 401);

    // Find user in preseeded or created users
    let user = preseededUsersMap.get(payload.id);
    if (!user) {
      user = userStore.find(u => u.id === payload.id);
    }

    if (user) {
      return c.json({
        id: user.id,
        name: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        isActive: user.isActive,
        isVerified: user.isVerified,
        email: user.email,
        mobileNumber: user.mobileNumber,
        unit: user.unit,
        designation: user.designation,
        gender: user.gender,
        vid: user.vid,
        avatar: null,
        createdAt: user.createdAt,
        updatedAt: user.createdAt,
      });
    }

    // Fallback to token payload
    return c.json({
      id: payload.id,
      name: payload.name,
      role: payload.role,
      status: 'active',
      isActive: true,
      isVerified: true,
      avatar: null,
      email: `${payload.role}@vkumbh.org`,
      mobileNumber: '9876543210',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

app.post('/api/auth/logout', (c) => c.json({ success: true }));
app.post('/api/auth/refresh', (c) => c.json({ token: 'demo_token_' + Date.now() }));

// ===== Events API =====
app.get('/api/events', async (c) => c.json([
  { id: 'event-001', name: 'VKumbh 2025 Training', location: 'Ujjain', startDate: '2025-04-01', endDate: '2025-04-15', status: 'active' },
]));

app.get('/api/events/:eventId/schedule', async (c) => {
  const eventId = c.req.param('eventId');
  const scheduleWithSessions = daywiseSchedule.map(day => ({
    ...day,
    sessions: day.sessions.map((sid: string) => sessionsData.find(s => s.id === sid)).filter(Boolean),
  }));
  return c.json(scheduleWithSessions);
});

// ===== Sessions API =====
app.get('/api/sessions', async (c) => c.json(sessionsData));

app.get('/api/sessions/:sessionId', async (c) => {
  const session = sessionsData.find(s => s.id === c.req.param('sessionId'));
  if (!session) return c.json({ error: 'Session not found' }, 404);
  return c.json(session);
});

app.get('/api/sessions/:sessionId/attendance', async (c) => {
  const sessionId = c.req.param('sessionId');
  const sessionAttendance = attendanceStore.filter(a => a.sessionId === sessionId);
  if (sessionAttendance.length === 0) {
    // Generate demo attendance data (volunteers only, not admin)
    const session = sessionsData.find(s => s.id === sessionId);
    if (!session) return c.json([]);
    const demoAttendance = Array.from({ length: session.attended || 20 }, (_, i) => ({
      id: `att-${sessionId}-${i}`,
      userId: `vol-${String(i + 1).padStart(3, '0')}`,
      userName: `Volunteer ${i + 1}`,
      sessionId,
      eventId: 'event-001',
      status: i < (session.attended || 20) * 0.9 ? 'present' : (i < (session.attended || 20) * 0.95 ? 'late' : 'absent'),
      checkInAt: new Date(`${session.date}T${session.timeStart || '09:00'}:${String(i % 60).padStart(2, '0')}`).toISOString(),
      checkInMethod: i % 3 === 0 ? 'qr' : 'manual',
    }));
    return c.json(demoAttendance);
  }
  return c.json(sessionAttendance);
});

// ===== Attendance API =====
app.post('/api/attendance/check-in', async (c) => {
  const body = await c.req.json();

  // Check if user is admin (skip attendance for admin)
  const auth = c.req.header('authorization');
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    const payload = parseToken(token);
    if (payload && NO_ATTENDANCE_ROLES.includes(payload.role)) {
      return c.json({
        success: true,
        skipped: true,
        message: `Attendance not required for ${payload.role} role`,
        record: {
          id: crypto.randomUUID(),
          userId: payload.id,
          sessionId: body.sessionId,
          eventId: body.eventId || 'event-001',
          status: 'exempt',
          checkInAt: new Date().toISOString(),
          checkInMethod: body.method || 'auto',
        },
      });
    }
  }

  const record = {
    id: crypto.randomUUID(),
    ...body,
    status: 'present',
    checkInAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  attendanceStore.push(record);
  return c.json({ success: true, record, message: 'Attendance marked successfully' });
});

app.post('/api/attendance/manual-checkin', async (c) => {
  // Manual check-in endpoint for instructors to mark volunteers
  const body = await c.req.json();
  const { sessionId, eventId, userId, userName, reason } = body;

  if (!sessionId || !userId) {
    return c.json({ error: 'sessionId and userId are required' }, 400);
  }

  // Get the instructor ID from auth
  let overrideBy = 'instructor';
  const auth = c.req.header('authorization');
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    const payload = parseToken(token);
    if (payload) overrideBy = payload.id;
  }

  const record = {
    id: crypto.randomUUID(),
    userId,
    userName: userName || `User ${userId}`,
    sessionId,
    eventId: eventId || 'event-001',
    status: 'present',
    checkInAt: new Date().toISOString(),
    checkInMethod: 'manual_override',
    overrideBy,
    overrideReason: reason || 'Manual check-in by instructor',
    createdAt: new Date().toISOString(),
  };
  attendanceStore.push(record);
  return c.json({ success: true, record, message: 'Manual attendance marked successfully' });
});

app.get('/api/attendance/my', (c) => c.json([
  { id: 'att-001', sessionId: 's-001', sessionName: 'Morning: Behavioral Modification I', eventId: 'event-001', status: 'present', checkInAt: '2025-04-01T09:15:00Z', checkInMethod: 'qr' },
  { id: 'att-002', sessionId: 's-002', sessionName: 'Afternoon: Behavioral Modification II', eventId: 'event-001', status: 'present', checkInAt: '2025-04-01T14:05:00Z', checkInMethod: 'manual' },
  { id: 'att-003', sessionId: 's-003', sessionName: 'Full Day: Disaster Management & First Aid', eventId: 'event-001', status: 'present', checkInAt: '2025-04-02T09:00:00Z', checkInMethod: 'qr' },
]));

app.get('/api/attendance/stats/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const session = sessionsData.find(s => s.id === sessionId);
  if (!session) return c.json({ error: 'Session not found' }, 404);

  const total = session.enrolled || 25;
  const present = session.attended || 22;
  return c.json({
    total,
    present,
    absent: total - present,
    late: Math.floor(total * 0.03),
    excused: Math.floor(total * 0.02),
    percentage: Math.round((present / total) * 100),
    byMethod: { qr: Math.floor(present * 0.6), manual: Math.floor(present * 0.4) },
  });
});

// ===== QR API =====
app.post('/api/qr/generate/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const body = await c.req.json().catch(() => ({}));
  const session = sessionsData.find(s => s.id === sessionId);

  const timestamp = Date.now();
  const nonce = Math.random().toString(36).slice(2, 10);
  const qrPayload = {
    sessionId,
    sessionName: session?.name || 'Unknown Session',
    instructorId: body.instructorId || 'inst-001',
    timestamp,
    nonce,
    expiresAt: timestamp + 15 * 60 * 1000,
  };
  const qrData = Buffer.from(JSON.stringify(qrPayload)).toString('base64');

  const record = { qrData, sessionId, expiresIn: 900, createdAt: new Date().toISOString() };
  qrStore.push(record);

  return c.json({
    qrData,
    sessionId,
    sessionName: session?.name,
    expiresIn: 900,
    expiresAt: new Date(timestamp + 15 * 60 * 1000).toISOString(),
  });
});

app.post('/api/qr/validate', async (c) => {
  const body = await c.req.json();
  const qrData = body.qrData;
  if (!qrData) return c.json({ error: 'qrData required' }, 400);

  try {
    const payload = JSON.parse(Buffer.from(qrData, 'base64').toString());
    const expired = payload.expiresAt < Date.now();
    return c.json({
      valid: !expired,
      sessionId: payload.sessionId,
      sessionName: payload.sessionName,
      instructorId: payload.instructorId,
      expired,
      message: expired ? 'QR code has expired' : 'QR code validated successfully',
    });
  } catch {
    return c.json({
      valid: true,
      sessionId: 'session-001',
      sessionName: 'Demo Session',
      instructorId: 'demo-instructor',
      expired: false,
      message: 'QR validated (Demo fallback mode)',
    });
  }
});

// ===== Exams API =====
app.get('/api/exams', async (c) => {
  const passingScore = await ConfigService.getInt('exam.passing_score_percentage', 50);
  const qCountPre = await ConfigService.getInt('exam.question_count_pre_test', 15);
  const qCountPost = await ConfigService.getInt('exam.question_count_post_test', 30);
  const durPre = await ConfigService.getInt('exam.duration_minutes_pre_test', 30);
  const durPost = await ConfigService.getInt('exam.duration_minutes_post_test', 60);
  return c.json([
    { id: 'exam-001', eventId: 'event-001', name: 'Pre-Test: Basic Training Assessment', type: 'pre_test', status: 'published', durationMinutes: durPre, passingScore, maxAttempts: 1, questionCount: qCountPre, instructions: `Answer all ${qCountPre} questions. Minimum ${passingScore}% required to pass.` },
    { id: 'exam-002', eventId: 'event-001', name: 'Post-Test: Comprehensive Assessment', type: 'post_test', status: 'published', durationMinutes: durPost, passingScore, maxAttempts: 2, questionCount: qCountPost, instructions: `Comprehensive assessment covering all training modules. Minimum ${passingScore}% required to pass.` },
  ]);
});

app.get('/api/exams/:examId', async (c) => {
  const passingScore = await ConfigService.getInt('exam.passing_score_percentage', 50);
  const qCount = await ConfigService.getInt('exam.question_count_post_test', 30);
  const dur = await ConfigService.getInt('exam.duration_minutes_post_test', 60);
  return c.json({ id: c.req.param('examId'), name: 'Comprehensive Assessment', type: 'post_test', status: 'published', durationMinutes: dur, passingScore, questionCount: qCount });
});

app.post('/api/exams/:examId/start', (c) => c.json({
  id: crypto.randomUUID(), examId: c.req.param('examId'), startedAt: new Date(), durationMinutes: 60,
  questions: [
    { id: 'q1', question: 'What is the primary purpose of the VKumbh training program?', options: { a: 'To certify volunteers for the Kumbh Mela', b: 'To provide general education', c: 'To recruit military personnel', d: 'To organize religious events' }, orderIndex: 0 },
    { id: 'q2', question: 'Which of the following is NOT a training module?', options: { a: 'Behavioral Modification', b: 'Disaster Management', c: 'Fire Safety', d: 'Financial Accounting' }, orderIndex: 1 },
    { id: 'q3', question: 'How many days does the standard training program last?', options: { a: '3 days', b: '5 days', c: '6 days', d: '7 days' }, orderIndex: 2 },
    { id: 'q4', question: 'What is the minimum attendance required for exam eligibility?', options: { a: '70%', b: '80%', c: '90%', d: '100%' }, orderIndex: 3 },
    { id: 'q5', question: 'Who can generate QR codes for session attendance?', options: { a: 'Any volunteer', b: 'Only instructors', c: 'Only admin', d: 'Anyone with the app' }, orderIndex: 4 },
  ]
}));

app.post('/api/exams/:examId/submit', async (c) => {
  const body = await c.req.json();
  const passingScore = await ConfigService.getInt('exam.passing_score_percentage', 50);
  const score = 4;
  const total = 5;
  const percentage = Math.round((score / total) * 100);

  // Store the attempt
  const attempt = {
    id: crypto.randomUUID(),
    examId: c.req.param('examId'),
    userId: 'vol-001',
    userName: 'Rahul Sharma',
    score,
    totalQuestions: total,
    percentage,
    isPassed: percentage >= passingScore,
    submittedAt: new Date().toISOString(),
  };
  examAttemptsStore.push(attempt);

  return c.json({ id: crypto.randomUUID(), score, totalQuestions: total, percentage, isPassed: percentage >= passingScore, submittedAt: new Date() });
});

app.get('/api/exams/attempts/my', (c) => c.json(examAttemptsStore.filter(a => a.userId === 'vol-001')));

// ===== Results API (for assessment_admin) =====
app.get('/api/exams/attempts/all', (c) => c.json(examAttemptsStore));

// ===== Certificates API =====
app.get('/api/certificates/my', (c) => {
  const auth = c.req.header('authorization');
  let userId = 'vol-001';
  if (auth?.startsWith('Bearer ')) {
    try {
      const payload = parseToken(auth.slice(7));
      if (payload) userId = payload.id;
    } catch { /* ignore */ }
  }
  return c.json(certificateStore.filter(c => c.userId === userId));
});

app.get('/api/certificates/:id/download', (c) => {
  const cert = certificateStore.find(c => c.id === c.req.param('id'));
  if (!cert) return c.json({ error: 'Certificate not found' }, 404);
  return c.json({
    downloadUrl: '#',
    certificate: cert,
    message: 'Certificate download ready',
  });
});

// ===== Admin: Config (DB-Persisted) =====
app.get('/api/admin/config', async (c) => {
  try {
    const configs = await ConfigService.getAll();
    return c.json(configs.map((c) => ({
      key: c.key, value: c.dbValue, defaultValue: c.value, value_type: c.valueType,
      category: c.category, description: c.description, editable_by_admin: c.editableByAdmin,
      requires_restart: c.requiresRestart, min_value: c.minValue ?? null, max_value: c.maxValue ?? null,
      updated_at: c.updatedAt, updated_by: c.updatedBy,
    })));
  } catch {
    return c.json({ error: 'Failed to load configuration' }, 500);
  }
});

app.patch('/api/admin/configurations', async (c) => {
  const body = await c.req.json();
  if (!body.key || body.value === undefined) return c.json({ error: 'key and value required' }, 400);
  const result = await ConfigService.update(body.key, String(body.value), 'admin');
  return c.json({ key: body.key, value: body.value, ...result });
});

app.patch('/api/admin/configurations/bulk', async (c) => {
  const body = await c.req.json();
  if (!body.updates || !Array.isArray(body.updates)) return c.json({ error: 'updates array required' }, 400);
  const results = await ConfigService.bulkUpdate(body.updates, 'admin');
  return c.json({ results });
});

app.get('/api/admin/config/categories', (c) => c.json(ConfigService.getCategories()));
app.post('/api/admin/config/reset/:key', async (c) => {
  const result = await ConfigService.resetToDefault(c.req.param('key'), 'admin');
  return c.json({ key: c.req.param('key'), ...result });
});

// ===== Admin: Stats =====
app.get('/api/admin/stats', (c) => c.json({
  totalVolunteers: userStore.filter(u => u.role === 'volunteer').length + 1240,
  totalInstructors: userStore.filter(u => u.role === 'instructor').length + 45,
  totalSessions: sessionsData.length,
  totalCheckIns: attendanceStore.length + 8934,
  avgAttendance: 87.5,
  examPassRate: 78.2,
  activeEvents: 1,
  certificatesIssued: certificateStore.length + 892,
  totalExams: 2,
  upcomingSessions: sessionsData.filter(s => s.status === 'scheduled').length,
  completedSessions: sessionsData.filter(s => s.status === 'completed').length,
  inProgressSessions: sessionsData.filter(s => s.status === 'in_progress').length,
  pendingVerifications: 23,
}));

// ===== Admin: API Status =====
app.get('/api/admin/api-status', (c) => c.json([
  { name: 'PostgreSQL Database', status: 'operational', latency: '12ms', uptime: '99.9%', lastChecked: new Date().toISOString() },
  { name: 'Redis Cache', status: 'operational', latency: '3ms', uptime: '99.99%', lastChecked: new Date().toISOString() },
  { name: 'S3 Storage', status: 'operational', latency: '45ms', uptime: '99.95%', lastChecked: new Date().toISOString() },
  { name: 'SMS Gateway', status: 'degraded', latency: '320ms', uptime: '97.5%', lastChecked: new Date().toISOString() },
  { name: 'Email Service', status: 'operational', latency: '89ms', uptime: '99.8%', lastChecked: new Date().toISOString() },
  { name: 'Aadhaar API', status: 'operational', latency: '156ms', uptime: '99.9%', lastChecked: new Date().toISOString() },
  { name: 'Push Notification', status: 'operational', latency: '23ms', uptime: '99.9%', lastChecked: new Date().toISOString() },
  { name: 'QR Generator', status: 'operational', latency: '5ms', uptime: '100%', lastChecked: new Date().toISOString() },
]));

// ===== Admin: Reports =====
app.get('/api/admin/reports', (c) => c.json([
  { id: 'rpt-001', type: 'attendance', title: 'Daily Attendance Report', generatedAt: new Date().toISOString(), status: 'ready', format: 'pdf', size: '245 KB' },
  { id: 'rpt-002', type: 'eligibility', title: 'Volunteer Eligibility Summary', generatedAt: new Date(Date.now() - 86400000).toISOString(), status: 'ready', format: 'xlsx', size: '128 KB' },
  { id: 'rpt-003', type: 'unit_wise', title: 'Unit-wise Performance Report', generatedAt: new Date(Date.now() - 172800000).toISOString(), status: 'ready', format: 'pdf', size: '512 KB' },
  { id: 'rpt-004', type: 'certificate', title: 'Certificate Issuance Report', generatedAt: new Date(Date.now() - 259200000).toISOString(), status: 'ready', format: 'pdf', size: '189 KB' },
  { id: 'rpt-005', type: 'exam', title: 'Exam Results Analysis', generatedAt: new Date(Date.now() - 345600000).toISOString(), status: 'ready', format: 'xlsx', size: '356 KB' },
]));

app.post('/api/admin/reports/:reportId/generate', (c) => c.json({
  id: c.req.param('reportId'),
  status: 'generating',
  estimatedTime: '30s',
  message: 'Report generation started',
}));

// ===== Admin: Users =====
app.get('/api/admin/users', (c) => {
  // Combine preseeded users with any dynamically created users
  const allUsers = userStore.map(u => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    fullName: u.fullName,
    name: u.fullName,
    role: u.role,
    mobileNumber: u.mobileNumber,
    phone: u.mobileNumber,
    email: u.email,
    unit: u.unit,
    isVerified: u.isVerified,
    status: u.status,
    isActive: u.isActive,
    joinedAt: u.createdAt,
    attendance: u.attendance || (u.role === 'admin' ? 100 : u.role === 'instructor' ? 98 : 85),
  }));

  return c.json({ users: allUsers, total: allUsers.length });
});

app.patch('/api/admin/users/:userId/role', async (c) => {
  const body = await c.req.json();
  const userId = c.req.param('userId');
  const user = userStore.find(u => u.id === userId);
  if (user) {
    user.role = body.role;
  }
  return c.json({ userId, role: body.role, updated: true });
});

app.patch('/api/admin/users/:userId/status', async (c) => {
  const body = await c.req.json();
  const userId = c.req.param('userId');
  const user = userStore.find(u => u.id === userId);
  if (user) {
    user.status = body.status;
  }
  return c.json({ userId, status: body.status, updated: true });
});

app.get('/api/admin/tent-config', async (c) => {
  const configs = await ConfigService.getAll();
  const keys = ['tent.total_count', 'tent.capacity_per_tent', 'tent.global_capacity_cap', 'tent.female_sector_start', 'tent.female_sector_end', 'tent.male_sector_start', 'tent.male_sector_end'];
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = configs.find((x) => x.key === k)?.dbValue ?? '';
  return c.json(out);
});

// Sync
app.post('/api/sync/batch', async (c) => {
  const body = await c.req.json();
  return c.json({ results: (body.items || []).map((item: any) => ({ id: item.id, success: true })) });
});

// 404
app.notFound((c) => c.json({ error: 'Not Found', path: c.req.path }, 404));

// Error
app.onError((err, c) => {
  console.error(`[Error] ${c.req.method} ${c.req.path}:`, (err as Error).message);
  return c.json({ error: 'Internal Server Error', message: (err as Error).message }, 500);
});

// Start
console.log(`VKumbh Backend starting on ${HOST}:${PORT}...`);
console.log(`Environment: ${NODE_ENV}`);
console.log(`CORS: Allowing all origins in development mode`);
console.log(`Preseeded ${PRESEEDED_USERS.length} users (instructors and admins)`);
console.log(`Roles exempt from attendance: ${NO_ATTENDANCE_ROLES.join(', ')}`);

ConfigService.initializeDefaults().then(() => {
  console.log('[ConfigService] Defaults initialized');
}).catch((err) => {
  console.warn('[ConfigService] Init failed:', err.message);
});

serve({ fetch: app.fetch, port: PORT, hostname: HOST });
