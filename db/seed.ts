import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import {
  users,
  kumbhEvents,
  sessions,
  exams,
  questions,
  certificates,
  systemConfig,
  attendanceRecords,
  examAttempts,
} from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const client = postgres(connectionString);
const db = drizzle(client);

// ── Config Service Defaults ──
const DEFAULT_CONFIG = [
  { key: "attendance.threshold_percentage", value: "90", category: "attendance", description: "Minimum attendance percentage required for exam eligibility", valueType: "integer", minValue: 0, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "attendance.min_sessions_required", value: "11", category: "attendance", description: "Minimum number of attended sessions to qualify", valueType: "integer", minValue: 0, maxValue: 20, editableByAdmin: true, requiresRestart: false },
  { key: "attendance.total_sessions", value: "12", category: "attendance", description: "Total number of attendance sessions in the training program", valueType: "integer", minValue: 1, maxValue: 50, editableByAdmin: true, requiresRestart: false },
  { key: "attendance.checkin_window_minutes", value: "30", category: "attendance", description: "Time window around session start for QR check-in", valueType: "integer", minValue: 5, maxValue: 120, editableByAdmin: true, requiresRestart: false },
  { key: "attendance.manual_override_enabled", value: "true", category: "attendance", description: "Allow instructors to manually override attendance", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
  { key: "attendance.manual_override_grace_minutes", value: "15", category: "attendance", description: "Grace period after session ends for manual override", valueType: "integer", minValue: 0, maxValue: 60, editableByAdmin: true, requiresRestart: false },
  { key: "attendance.instructor_override_alert_threshold", value: "20", category: "attendance", description: "Alert admin if instructor manually marks more than this % of a batch", valueType: "integer", minValue: 0, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "tent.total_count", value: "15", category: "logistics", description: "Total number of tents available", valueType: "integer", minValue: 1, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "tent.capacity_per_tent", value: "24", category: "logistics", description: "Maximum residents per tent", valueType: "integer", minValue: 1, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "tent.global_capacity_cap", value: "300", category: "logistics", description: "Global maximum volunteers for tent allocation", valueType: "integer", minValue: 0, maxValue: 5000, editableByAdmin: true, requiresRestart: false },
  { key: "tent.female_sector_start", value: "1", category: "logistics", description: "Starting tent number for female sector", valueType: "integer", minValue: 1, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "tent.female_sector_end", value: "7", category: "logistics", description: "Ending tent number for female sector", valueType: "integer", minValue: 1, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "tent.male_sector_start", value: "8", category: "logistics", description: "Starting tent number for male sector", valueType: "integer", minValue: 1, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "tent.male_sector_end", value: "15", category: "logistics", description: "Ending tent number for male sector", valueType: "integer", minValue: 1, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "tent.allocation_strategy", value: "fcfs_fill_full", category: "logistics", description: "Tent allocation strategy", valueType: "string", editableByAdmin: true, requiresRestart: false },
  { key: "exam.question_bank_size", value: "1000", category: "assessment", description: "Total questions in the MCQ bank", valueType: "integer", minValue: 100, maxValue: 10000, editableByAdmin: true, requiresRestart: false },
  { key: "exam.question_count_pre_test", value: "15", category: "assessment", description: "Number of questions in Day 1 Pre-Test", valueType: "integer", minValue: 5, maxValue: 50, editableByAdmin: true, requiresRestart: false },
  { key: "exam.question_count_post_test", value: "30", category: "assessment", description: "Number of questions in Day 6 Post-Test", valueType: "integer", minValue: 10, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "exam.passing_score_percentage", value: "50", category: "assessment", description: "Minimum score percentage to pass exam", valueType: "integer", minValue: 0, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "exam.max_attempts", value: "2", category: "assessment", description: "Maximum attempts allowed per exam", valueType: "integer", minValue: 1, maxValue: 10, editableByAdmin: true, requiresRestart: false },
  { key: "exam.duration_minutes_pre_test", value: "30", category: "assessment", description: "Duration of Day 1 Pre-Test in minutes", valueType: "integer", minValue: 10, maxValue: 120, editableByAdmin: true, requiresRestart: false },
  { key: "exam.duration_minutes_post_test", value: "60", category: "assessment", description: "Duration of Day 6 Post-Test in minutes", valueType: "integer", minValue: 10, maxValue: 180, editableByAdmin: true, requiresRestart: false },
  { key: "exam.retake_allowed", value: "true", category: "assessment", description: "Allow volunteers to retake failed exams", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
  { key: "batch.training_days", value: "6", category: "batch", description: "Number of training days in a batch", valueType: "integer", minValue: 1, maxValue: 30, editableByAdmin: true, requiresRestart: false },
  { key: "batch.sessions_per_day", value: "2", category: "batch", description: "Number of sessions per day", valueType: "integer", minValue: 1, maxValue: 5, editableByAdmin: true, requiresRestart: false },
  { key: "batch.max_volunteers_per_batch", value: "300", category: "batch", description: "Maximum volunteers per training batch", valueType: "integer", minValue: 10, maxValue: 1000, editableByAdmin: true, requiresRestart: false },
  { key: "batch.registration_cutoff_hours", value: "24", category: "batch", description: "Hours before batch start when registration closes", valueType: "integer", minValue: 0, maxValue: 168, editableByAdmin: true, requiresRestart: false },
  { key: "certificate.auto_generate", value: "true", category: "certificate", description: "Auto-generate certificates upon passing", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
  { key: "certificate.require_both_attendance_and_exam", value: "true", category: "certificate", description: "Require both attendance and exam for certificate", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
  { key: "qr.validity_minutes", value: "15", category: "security", description: "QR code validity duration in minutes", valueType: "integer", minValue: 1, maxValue: 60, editableByAdmin: true, requiresRestart: false },
  { key: "notifications.sms_enabled", value: "true", category: "notifications", description: "Enable SMS notifications", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
  { key: "notifications.whatsapp_enabled", value: "false", category: "notifications", description: "Enable WhatsApp notifications", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
  { key: "registration.enabled", value: "true", category: "general", description: "Allow new volunteer registrations", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
  { key: "registration.max_per_day", value: "500", category: "general", description: "Maximum registrations per day", valueType: "integer", minValue: 1, maxValue: 2000, editableByAdmin: true, requiresRestart: false },
  { key: "registration.require_aadhaar", value: "false", category: "general", description: "Require Aadhaar verification during registration", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
];

async function seed() {
  console.log("[Seed] Starting database seed...");

  // ── Seed System Config ──
  console.log("[Seed] Inserting system config...");
  for (const config of DEFAULT_CONFIG) {
    const existing = await db.select().from(systemConfig).where(eq(systemConfig.key, config.key)).limit(1);
    if (existing.length === 0) {
      await db.insert(systemConfig).values(config);
    }
  }

  // ── Seed Admin Users (anonymized) ──
  console.log("[Seed] Inserting admin users...");
  const adminData = [
    { vid: "VK-2025-0001", fullName: "Admin 1", firstName: "Admin", lastName: "1", email: "admin1@vkumbh.org", mobileNumber: "9876543200", role: "admin" as const, unit: "CHMES HQ", designation: "Training Director", gender: "male", isVerified: true, status: "active" as const, isActive: true, attendance: 100 },
    { vid: "VK-2025-0002", fullName: "Admin 2", firstName: "Admin", lastName: "2", email: "admin2@vkumbh.org", mobileNumber: "9876543205", role: "admin" as const, unit: "CHMES HQ", designation: "System Administrator", gender: "male", isVerified: true, status: "active" as const, isActive: true, attendance: 100 },
  ];
  for (const admin of adminData) {
    const existing = await db.select().from(users).where(eq(users.vid, admin.vid)).limit(1);
    if (existing.length === 0) {
      await db.insert(users).values(admin);
    }
  }

  // ── Seed Instructors (anonymized) ──
  console.log("[Seed] Inserting instructors...");
  const instructorData = [
    { vid: "VK-2025-2001", fullName: "Instructor 1", firstName: "Instructor", lastName: "1", email: "instructor1@vkumbh.org", mobileNumber: "9876543201", role: "instructor" as const, unit: "CHMES Training Wing", designation: "Lead Instructor", gender: "male", isVerified: true, status: "active" as const, isActive: true, attendance: 100 },
    { vid: "VK-2025-2002", fullName: "Instructor 2", firstName: "Instructor", lastName: "2", email: "instructor2@vkumbh.org", mobileNumber: "9876543202", role: "instructor" as const, unit: "DES PU", designation: "Disaster Management Expert", gender: "female", isVerified: true, status: "active" as const, isActive: true, attendance: 98 },
    { vid: "VK-2025-2003", fullName: "Instructor 3", firstName: "Instructor", lastName: "3", email: "instructor3@vkumbh.org", mobileNumber: "9876543203", role: "instructor" as const, unit: "CHMES Training Wing", designation: "Crowd Control Specialist", gender: "male", isVerified: true, status: "active" as const, isActive: true, attendance: 96 },
  ];
  for (const inst of instructorData) {
    const existing = await db.select().from(users).where(eq(users.vid, inst.vid)).limit(1);
    if (existing.length === 0) {
      await db.insert(users).values(inst);
    }
  }

  // ── Seed Assessment Admin (anonymized) ──
  console.log("[Seed] Inserting assessment admin...");
  const asmData = [
    { vid: "VK-2025-3001", fullName: "Assessment Admin 1", firstName: "Assessment", lastName: "Admin 1", email: "assessment1@vkumbh.org", mobileNumber: "9876543204", role: "assessment_admin" as const, unit: "DES PU", designation: "Assessment Coordinator", gender: "female", isVerified: true, status: "active" as const, isActive: true, attendance: 100 },
  ];
  for (const asm of asmData) {
    const existing = await db.select().from(users).where(eq(users.vid, asm.vid)).limit(1);
    if (existing.length === 0) {
      await db.insert(users).values(asm);
    }
  }

  // ── Seed Volunteers (real names) ──
  console.log("[Seed] Inserting volunteers...");
  const volunteerData = [
    { vid: "VK-2025-1001", fullName: "Rahul Sharma", firstName: "Rahul", lastName: "Sharma", email: "rahul@vkumbh.org", mobileNumber: "9876543210", role: "volunteer" as const, unit: "Unit A", designation: "Volunteer", gender: "male", isVerified: true, status: "active" as const, isActive: true, attendance: 85 },
    { vid: "VK-2025-1002", fullName: "Priya Patel", firstName: "Priya", lastName: "Patel", email: "priya@vkumbh.org", mobileNumber: "9876543211", role: "volunteer" as const, unit: "Unit B", designation: "Volunteer", gender: "female", isVerified: true, status: "active" as const, isActive: true, attendance: 92 },
    { vid: "VK-2025-1003", fullName: "Amit Kumar", firstName: "Amit", lastName: "Kumar", email: "amit@vkumbh.org", mobileNumber: "9876543212", role: "volunteer" as const, unit: "Unit A", designation: "Volunteer", gender: "male", isVerified: true, status: "active" as const, isActive: true, attendance: 78 },
    { vid: "VK-2025-1004", fullName: "Sneha Gupta", firstName: "Sneha", lastName: "Gupta", email: "sneha@vkumbh.org", mobileNumber: "9876543213", role: "volunteer" as const, unit: "Unit C", designation: "Volunteer", gender: "female", isVerified: false, status: "pending" as const, isActive: true, attendance: 0 },
    { vid: "VK-2025-1005", fullName: "Vikram Singh", firstName: "Vikram", lastName: "Singh", email: "vikram@vkumbh.org", mobileNumber: "9876543214", role: "volunteer" as const, unit: "Unit A", designation: "Volunteer", gender: "male", isVerified: true, status: "active" as const, isActive: true, attendance: 95 },
  ];
  for (const vol of volunteerData) {
    const existing = await db.select().from(users).where(eq(users.vid, vol.vid)).limit(1);
    if (existing.length === 0) {
      await db.insert(users).values(vol);
    }
  }

  // ── Seed Event ──
  console.log("[Seed] Inserting events...");
  const eventData = [
    { name: "VKumbh 2025 Training", location: "Ujjain", startDate: new Date("2025-04-01"), endDate: new Date("2025-04-15"), status: "active", maxVolunteers: 5000, attendanceThreshold: 90 },
  ];
  for (const evt of eventData) {
    const existing = await db.select().from(kumbhEvents).limit(1);
    if (existing.length === 0) {
      await db.insert(kumbhEvents).values(evt);
    }
  }

  // Get the inserted event
  const events = await db.select().from(kumbhEvents).limit(1);
  const eventId = events[0]?.id;

  // Get instructor IDs
  const instructorRows = await db.select().from(users).where(eq(users.role, "instructor"));
  const inst1 = instructorRows[0]?.id;
  const inst2 = instructorRows[1]?.id;
  const inst3 = instructorRows[2]?.id;

  // ── Seed Sessions ──
  console.log("[Seed] Inserting sessions...");
  const sessionData = [
    { eventId, name: "Morning: Behavioral Modification I", slot: "morning" as const, date: new Date("2025-04-01"), venue: "Hall A", capacity: 200, enrolled: 187, attended: 172, instructorId: inst1, status: "completed" as const, timeStart: "09:00", timeEnd: "12:00" },
    { eventId, name: "Afternoon: Behavioral Modification II", slot: "afternoon" as const, date: new Date("2025-04-01"), venue: "Hall B", capacity: 150, enrolled: 143, attended: 138, instructorId: inst2, status: "completed" as const, timeStart: "14:00", timeEnd: "17:00" },
    { eventId, name: "Full Day: Disaster Management & First Aid", slot: "full_day" as const, date: new Date("2025-04-02"), venue: "Hall A", capacity: 200, enrolled: 195, attended: 189, instructorId: inst1, status: "completed" as const, timeStart: "09:00", timeEnd: "17:00" },
    { eventId, name: "Morning: Crowd Control Techniques", slot: "morning" as const, date: new Date("2025-04-03"), venue: "Training Ground", capacity: 250, enrolled: 230, attended: 218, instructorId: inst3, status: "in_progress" as const, timeStart: "09:00", timeEnd: "12:00" },
    { eventId, name: "Afternoon: Communication Protocols", slot: "afternoon" as const, date: new Date("2025-04-03"), venue: "Hall C", capacity: 180, enrolled: 165, attended: 0, instructorId: inst2, status: "scheduled" as const, timeStart: "14:00", timeEnd: "17:00" },
    { eventId, name: "Emergency Response Simulation", slot: "morning" as const, date: new Date("2025-04-04"), venue: "Field Area", capacity: 300, enrolled: 280, attended: 0, instructorId: inst1, status: "scheduled" as const, timeStart: "09:00", timeEnd: "12:00" },
    { eventId, name: "Review & Assessment Prep", slot: "afternoon" as const, date: new Date("2025-04-04"), venue: "Hall A", capacity: 200, enrolled: 190, attended: 0, instructorId: inst3, status: "scheduled" as const, timeStart: "14:00", timeEnd: "16:00" },
  ];
  for (const sess of sessionData) {
    const existing = await db.select().from(sessions).limit(1);
    if (existing.length === 0) {
      await db.insert(sessions).values(sess);
    }
  }

  // ── Seed Exams ──
  console.log("[Seed] Inserting exams...");
  const examData = [
    { eventId, name: "Pre-Test: Basic Training Assessment", type: "pre_test" as const, status: "published" as const, durationMinutes: 30, passingScore: 50, maxAttempts: 1, questionCount: 15, instructions: "Answer all 15 questions. Minimum 50% required to pass." },
    { eventId, name: "Post-Test: Comprehensive Assessment", type: "post_test" as const, status: "published" as const, durationMinutes: 60, passingScore: 50, maxAttempts: 2, questionCount: 30, instructions: "Comprehensive assessment covering all training modules. Minimum 50% required to pass." },
  ];
  for (const exam of examData) {
    const existing = await db.select().from(exams).limit(1);
    if (existing.length === 0) {
      await db.insert(exams).values(exam);
    }
  }

  // ── Seed Questions ──
  console.log("[Seed] Inserting questions...");
  const examRows = await db.select().from(exams);
  const preTestId = examRows.find(e => e.type === "pre_test")?.id;
  const postTestId = examRows.find(e => e.type === "post_test")?.id;

  const questionData = [
    { examId: preTestId, question: "What is the primary purpose of the VKumbh training program?", options: { a: "To certify volunteers for the Kumbh Mela", b: "To provide general education", c: "To recruit military personnel", d: "To organize religious events" } as Record<string, string>, correctAnswer: "a", difficulty: "easy", category: "General", explanation: "The VKumbh program trains volunteers for the Kumbh Mela.", orderIndex: 0 },
    { examId: preTestId, question: "Which of the following is NOT a training module?", options: { a: "Behavioral Modification", b: "Disaster Management", c: "Fire Safety", d: "Financial Accounting" } as Record<string, string>, correctAnswer: "d", difficulty: "easy", category: "General", explanation: "Financial Accounting is not part of the volunteer training.", orderIndex: 1 },
    { examId: preTestId, question: "How many days does the standard training program last?", options: { a: "3 days", b: "5 days", c: "6 days", d: "7 days" } as Record<string, string>, correctAnswer: "c", difficulty: "easy", category: "General", explanation: "The standard training program is 6 days long.", orderIndex: 2 },
    { examId: preTestId, question: "What is the minimum attendance required for exam eligibility?", options: { a: "70%", b: "80%", c: "90%", d: "100%" } as Record<string, string>, correctAnswer: "c", difficulty: "easy", category: "Attendance", explanation: "Minimum 90% attendance is required for exam eligibility.", orderIndex: 3 },
    { examId: preTestId, question: "Who can generate QR codes for session attendance?", options: { a: "Any volunteer", b: "Only instructors", c: "Only admin", d: "Anyone with the app" } as Record<string, string>, correctAnswer: "b", difficulty: "easy", category: "General", explanation: "Only instructors can generate QR codes.", orderIndex: 4 },
    { examId: postTestId, question: "What is the first step in crowd management?", options: { a: "Panic and run", b: "Assess the situation and stay calm", c: "Push people aside", d: "Ignore the crowd" } as Record<string, string>, correctAnswer: "b", difficulty: "easy", category: "Behavioral", explanation: "Staying calm allows for rational decision-making.", orderIndex: 0 },
    { examId: postTestId, question: "In case of fire, which type of extinguisher should be used for electrical fires?", options: { a: "Water-based", b: "Foam", c: "CO2 (Class C)", d: "Wet chemical" } as Record<string, string>, correctAnswer: "c", difficulty: "medium", category: "Fire", explanation: "CO2 extinguishers are safe for electrical fires.", orderIndex: 1 },
    { examId: postTestId, question: "What does CPR stand for?", options: { a: "Cardiac Patient Recovery", b: "Cardiopulmonary Resuscitation", c: "Critical Patient Response", d: "Cardiac Pulse Restoration" } as Record<string, string>, correctAnswer: "b", difficulty: "easy", category: "First Aid", explanation: "CPR is Cardiopulmonary Resuscitation.", orderIndex: 2 },
    { examId: postTestId, question: "During an earthquake, where should you take shelter?", options: { a: "Near windows", b: "Under a sturdy table or desk", c: "In an elevator", d: "Near tall furniture" } as Record<string, string>, correctAnswer: "b", difficulty: "easy", category: "Disaster", explanation: "Sturdy furniture protects from falling debris.", orderIndex: 3 },
    { examId: postTestId, question: "What is the emergency helpline number in India?", options: { a: "100", b: "101", c: "112", d: "All of the above" } as Record<string, string>, correctAnswer: "d", difficulty: "easy", category: "General", explanation: "All are valid emergency numbers in India.", orderIndex: 4 },
  ];
  for (const q of questionData) {
    const existing = await db.select().from(questions).limit(1);
    if (existing.length === 0) {
      await db.insert(questions).values(q);
    }
  }

  // ── Seed Certificates ──
  console.log("[Seed] Inserting certificates...");
  const volunteerRows = await db.select().from(users).where(eq(users.role, "volunteer"));
  const vol1 = volunteerRows[0]?.id;
  const vol1Name = volunteerRows[0]?.fullName;

  const certData = [
    { userId: vol1, certificateNumber: "VK-2025-CERT-0001", eventId, eventName: "VKumbh 2025 Training", volunteerName: vol1Name, issueDate: new Date("2025-04-15"), validUntil: new Date("2026-04-15"), status: "issued" as const, type: "Completion", grade: "A", score: 85, issuedAt: new Date("2025-04-15") },
  ];
  for (const cert of certData) {
    const existing = await db.select().from(certificates).limit(1);
    if (existing.length === 0) {
      await db.insert(certificates).values(cert);
    }
  }

  // ── Seed Sample Attendance ──
  console.log("[Seed] Inserting sample attendance...");
  const sessionRows = await db.select().from(sessions);
  if (sessionRows.length > 0 && volunteerRows.length > 0) {
    const firstSession = sessionRows[0];
    const firstVol = volunteerRows[0];
    const existing = await db.select().from(attendanceRecords).limit(1);
    if (existing.length === 0) {
      await db.insert(attendanceRecords).values({
        userId: firstVol.id,
        userName: firstVol.fullName,
        sessionId: firstSession.id,
        eventId,
        status: "present",
        checkInAt: new Date("2025-04-01T09:15:00"),
        checkInMethod: "qr",
      });
    }
  }

  // ── Seed Sample Exam Attempt ──
  console.log("[Seed] Inserting sample exam attempts...");
  if (examRows.length > 0 && volunteerRows.length > 0) {
    const firstExam = examRows[0];
    const firstVol = volunteerRows[0];
    const existing = await db.select().from(examAttempts).limit(1);
    if (existing.length === 0) {
      await db.insert(examAttempts).values({
        examId: firstExam.id,
        userId: firstVol.id,
        userName: firstVol.fullName,
        score: 12,
        totalQuestions: 15,
        percentage: 80,
        isPassed: true,
        submittedAt: new Date("2025-04-05T10:30:00"),
      });
    }
  }

  console.log("[Seed] Database seed complete!");
  await client.end();
}

seed().catch((err) => {
  console.error("[Seed] Error:", err);
  process.exit(1);
});
