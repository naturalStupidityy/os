import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import 'dotenv/config';

import { ConfigService } from './services/ConfigService';

const PORT = Number(process.env.PORT || 3001);

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Health check
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

// ===== Events & Sessions =====
app.get('/api/events', async (c) => c.json([
  { id: 'event-001', name: 'VKumbh 2025 Training', location: 'Ujjain', startDate: '2025-04-01', endDate: '2025-04-15', status: 'active' },
]));

app.get('/api/events/:eventId/schedule', async (c) => c.json([
  { date: '2025-04-01', day: 1, sessions: [
    { id: 's-001', eventId: 'event-001', name: 'Morning: Behavioral Modification I', slot: 'morning', date: '2025-04-01', venue: 'Hall A', capacity: 200, status: 'published' },
    { id: 's-002', eventId: 'event-001', name: 'Afternoon: Behavioral Modification II', slot: 'afternoon', date: '2025-04-01', venue: 'Hall B', capacity: 150, status: 'published' },
  ], hasExam: true, examType: 'pre_test' },
  { date: '2025-04-02', day: 2, sessions: [
    { id: 's-003', eventId: 'event-001', name: 'Full Day: Advanced Behavioral & Soft Skills', slot: 'morning', date: '2025-04-02', venue: 'Hall A', capacity: 200, status: 'published' },
  ], hasExam: false, examType: '' },
]));

// ===== Attendance =====
app.post('/api/attendance/check-in', async (c) => {
  const body = await c.req.json();
  return c.json({ id: crypto.randomUUID(), ...body, status: 'present', checkInAt: new Date() });
});
app.get('/api/attendance/my', (c) => c.json([
  { id: 'att-001', sessionId: 's-001', eventId: 'event-001', status: 'present', checkInAt: new Date().toISOString() },
]));

// ===== Exams =====
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
  return c.json({ id: crypto.randomUUID(), score, totalQuestions: total, percentage, isPassed: percentage >= passingScore, submittedAt: new Date() });
});

app.get('/api/exams/attempts/my', (c) => c.json([{ id: 'attempt-001', examId: 'exam-001', score: 4, totalQuestions: 5, percentage: 80, isPassed: true }]));

// ===== QR =====
app.post('/api/qr/generate/:sessionId', (c) => c.json({ qrData: 'demo-qr-' + Date.now(), sessionId: c.req.param('sessionId'), expiresIn: 900 }));

// ===== Certificates =====
app.get('/api/certificates/my', (c) => c.json([{ id: 'cert-001', certificateNumber: 'VK-2025-CERT-0001', status: 'issued', issuedAt: new Date() }]));
app.get('/api/certificates/:id/download', (c) => c.json({ downloadUrl: '#' }));

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

// ===== Admin: Stats, Status, Reports, Users =====
app.get('/api/admin/stats', (c) => c.json({ totalVolunteers: 1247, totalInstructors: 48, totalSessions: 156, totalCheckIns: 8934, avgAttendance: 87.5, examPassRate: 78.2, activeEvents: 1, certificatesIssued: 892 }));
app.get('/api/admin/api-status', (c) => c.json([
  { name: 'PostgreSQL', status: 'operational', latency: '12ms' },
  { name: 'Redis', status: 'operational', latency: '3ms' },
  { name: 'SMS Gateway', status: 'operational', latency: '45ms' },
]));
app.get('/api/admin/reports', (c) => c.json([{ id: 'rpt-001', type: 'attendance', title: 'Daily Attendance', generatedAt: new Date().toISOString(), status: 'ready' }]));
app.get('/api/admin/users', (c) => c.json({
  users: [
    { id: 'usr-001', firstName: 'Rahul', lastName: 'Sharma', fullName: 'Rahul Sharma', name: 'Rahul Sharma', role: 'volunteer', mobileNumber: '9876543210', phone: '9876543210', email: 'rahul@vkumbh.org', unit: 'Unit A', isVerified: true, status: 'active', isActive: true },
    { id: 'usr-002', firstName: 'Gp Capt', lastName: 'Kulkarni', fullName: 'Gp Capt Mahesh Kulkarni', name: 'Gp Capt Mahesh Kulkarni', role: 'instructor', mobileNumber: '9876543211', phone: '9876543211', email: 'instructor@vkumbh.org', unit: 'Training Wing', isVerified: true, status: 'active', isActive: true },
    { id: 'usr-003', firstName: 'Air Cmde', lastName: 'Sathe', fullName: 'Air Cmde Nitin Sathe', name: 'Air Cmde Nitin Sathe', role: 'admin', mobileNumber: '9876543212', phone: '9876543212', email: 'admin@vkumbh.org', unit: 'CHMES HQ', isVerified: true, status: 'active', isActive: true },
    { id: 'usr-004', firstName: 'Priya', lastName: 'Patel', fullName: 'Priya Patel', name: 'Priya Patel', role: 'volunteer', mobileNumber: '9876543213', phone: '9876543213', email: 'priya@vkumbh.org', unit: 'Unit B', isVerified: false, status: 'pending', isActive: true },
    { id: 'usr-005', firstName: 'Dr.', lastName: 'Joshi', fullName: 'Dr. Prachi Joshi', name: 'Dr. Prachi Joshi', role: 'assessment_admin', mobileNumber: '9876543214', phone: '9876543214', email: 'assessment@vkumbh.org', unit: 'DES PU', isVerified: true, status: 'active', isActive: true },
  ],
  total: 5,
}));
app.patch('/api/admin/users/:userId/role', (c) => c.json({ userId: c.req.param('userId'), updated: true }));
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
