import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import 'dotenv/config';

import { ConfigService } from './services/ConfigService';

const PORT = Number(process.env.PORT || 3001);

const app = new Hono();

// ===== In-memory data stores =====
const attendanceStore: any[] = [];
const qrStore: any[] = [];
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

// ===== Middleware =====
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ===== Health Check =====
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ===== Auth API =====
app.post('/api/auth/otp/request', async (c) => {
  const body = await c.req.json();
  return c.json({ requestId: crypto.randomUUID(), expiresIn: 600, message: `OTP sent to ${body.phone}` });
});

app.post('/api/auth/otp/verify', async (c) => {
  const body = await c.req.json();
  const phone = body.phone || '9876543210';
  const role = body.role || 'volunteer';

  const roleProfiles: Record<string, any> = {
    volunteer: { id: 'vol-001', vid: 'VK-2025-1001', firstName: 'Rahul', lastName: 'Sharma', fullName: 'Rahul Sharma', email: 'volunteer@vkumbh.org', unit: 'Unit A', designation: 'Volunteer', gender: 'male' },
    instructor: { id: 'inst-001', vid: 'VK-2025-2001', firstName: 'Gp Capt', lastName: 'Kulkarni', fullName: 'Gp Capt Mahesh Kulkarni', email: 'instructor@vkumbh.org', unit: 'CHMES Training Wing', designation: 'Lead Instructor', gender: 'male' },
    admin: { id: 'adm-001', vid: 'VK-2025-0001', firstName: 'Air Cmde', lastName: 'Sathe', fullName: 'Air Cmde Nitin Sathe', email: 'admin@vkumbh.org', unit: 'CHMES HQ', designation: 'Training Director', gender: 'male' },
    assessment_admin: { id: 'asm-001', vid: 'VK-2025-3001', firstName: 'Dr.', lastName: 'Joshi', fullName: 'Dr. Prachi Joshi', email: 'assessment@vkumbh.org', unit: 'DES PU', designation: 'Assessment Coordinator', gender: 'female' },
  };

  const profile = roleProfiles[role] || roleProfiles.volunteer;
  const token = `demo_token_${Buffer.from(JSON.stringify({ id: profile.id, role, name: profile.fullName, firstName: profile.firstName, lastName: profile.lastName, vid: profile.vid })).toString('base64')}`;

  return c.json({
    user: { ...profile, mobileNumber: phone, name: profile.fullName, role, status: 'active', isActive: true, isVerified: true, avatar: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    token,
    message: 'Login successful',
  });
});

app.get('/api/auth/me', async (c) => {
  const auth = c.req.header('authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  const token = auth.slice(7);
  try {
    const payload = JSON.parse(Buffer.from(token.replace('demo_token_', ''), 'base64').toString());
    return c.json({ id: payload.id, name: payload.name, role: payload.role, status: 'active', isActive: true, isVerified: true, avatar: null, email: `${payload.role}@vkumbh.org`, mobileNumber: '9876543210', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
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
    // Generate demo attendance data
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
      const payload = JSON.parse(Buffer.from(auth.slice(7).replace('demo_token_', ''), 'base64').toString());
      userId = payload.id;
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
  totalVolunteers: 1247,
  totalInstructors: 48,
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
app.get('/api/admin/users', (c) => c.json({
  users: [
    { id: 'usr-001', firstName: 'Rahul', lastName: 'Sharma', fullName: 'Rahul Sharma', name: 'Rahul Sharma', role: 'volunteer', mobileNumber: '9876543210', phone: '9876543210', email: 'rahul@vkumbh.org', unit: 'Unit A', isVerified: true, status: 'active', isActive: true, joinedAt: '2025-03-15', attendance: 92 },
    { id: 'usr-002', firstName: 'Gp Capt', lastName: 'Kulkarni', fullName: 'Gp Capt Mahesh Kulkarni', name: 'Gp Capt Mahesh Kulkarni', role: 'instructor', mobileNumber: '9876543211', phone: '9876543211', email: 'instructor@vkumbh.org', unit: 'Training Wing', isVerified: true, status: 'active', isActive: true, joinedAt: '2025-03-10', attendance: 100 },
    { id: 'usr-003', firstName: 'Air Cmde', lastName: 'Sathe', fullName: 'Air Cmde Nitin Sathe', name: 'Air Cmde Nitin Sathe', role: 'admin', mobileNumber: '9876543212', phone: '9876543212', email: 'admin@vkumbh.org', unit: 'CHMES HQ', isVerified: true, status: 'active', isActive: true, joinedAt: '2025-03-01', attendance: 100 },
    { id: 'usr-004', firstName: 'Priya', lastName: 'Patel', fullName: 'Priya Patel', name: 'Priya Patel', role: 'volunteer', mobileNumber: '9876543213', phone: '9876543213', email: 'priya@vkumbh.org', unit: 'Unit B', isVerified: false, status: 'pending', isActive: true, joinedAt: '2025-03-20', attendance: 45 },
    { id: 'usr-005', firstName: 'Dr.', lastName: 'Joshi', fullName: 'Dr. Prachi Joshi', name: 'Dr. Prachi Joshi', role: 'assessment_admin', mobileNumber: '9876543214', phone: '9876543214', email: 'assessment@vkumbh.org', unit: 'DES PU', isVerified: true, status: 'active', isActive: true, joinedAt: '2025-03-12', attendance: 98 },
    { id: 'usr-006', firstName: 'Vikram', lastName: 'Singh', fullName: 'Vikram Singh', name: 'Vikram Singh', role: 'volunteer', mobileNumber: '9876543215', phone: '9876543215', email: 'vikram@vkumbh.org', unit: 'Unit A', isVerified: true, status: 'active', isActive: true, joinedAt: '2025-03-18', attendance: 88 },
    { id: 'usr-007', firstName: 'Anjali', lastName: 'Gupta', fullName: 'Anjali Gupta', name: 'Anjali Gupta', role: 'volunteer', mobileNumber: '9876543216', phone: '9876543216', email: 'anjali@vkumbh.org', unit: 'Unit C', isVerified: true, status: 'active', isActive: true, joinedAt: '2025-03-22', attendance: 76 },
    { id: 'usr-008', firstName: 'Rajesh', lastName: 'Kumar', fullName: 'Rajesh Kumar', name: 'Rajesh Kumar', role: 'instructor', mobileNumber: '9876543217', phone: '9876543217', email: 'rajesh@vkumbh.org', unit: 'Training Wing', isVerified: true, status: 'active', isActive: true, joinedAt: '2025-03-08', attendance: 95 },
  ],
  total: 8,
}));

app.patch('/api/admin/users/:userId/role', async (c) => {
  const body = await c.req.json();
  return c.json({ userId: c.req.param('userId'), role: body.role, updated: true });
});

app.patch('/api/admin/users/:userId/status', async (c) => {
  const body = await c.req.json();
  return c.json({ userId: c.req.param('userId'), status: body.status, updated: true });
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
console.log(`VKumbh Backend starting on port ${PORT}...`);
ConfigService.initializeDefaults().then(() => {
  console.log('[ConfigService] Defaults initialized');
}).catch((err) => {
  console.warn('[ConfigService] Init failed:', err.message);
});
serve({ fetch: app.fetch, port: PORT });
