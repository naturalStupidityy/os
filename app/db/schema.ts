import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  json,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";

// ── Enums ──
export const userRoleEnum = pgEnum("user_role", [
  "volunteer",
  "instructor",
  "admin",
  "assessment_admin",
]);

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "pending",
  "inactive",
]);

export const sessionSlotEnum = pgEnum("session_slot", [
  "morning",
  "afternoon",
  "evening",
  "full_day",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "excused",
  "exempt",
]);

export const examTypeEnum = pgEnum("exam_type", ["pre_test", "post_test"]);

export const examStatusEnum = pgEnum("exam_status", [
  "draft",
  "published",
  "archived",
]);

export const certStatusEnum = pgEnum("cert_status", [
  "pending",
  "issued",
  "revoked",
]);

// ── Users ──
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  vid: varchar("vid", { length: 50 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  fullName: varchar("full_name", { length: 200 }),
  email: varchar("email", { length: 200 }),
  mobileNumber: varchar("mobile_number", { length: 20 }),
  role: userRoleEnum("role").notNull().default("volunteer"),
  unit: varchar("unit", { length: 200 }),
  designation: varchar("designation", { length: 200 }),
  gender: varchar("gender", { length: 20 }),
  photoUrl: text("photo_url"),
  isVerified: boolean("is_verified").notNull().default(false),
  status: userStatusEnum("status").notNull().default("active"),
  isActive: boolean("is_active").notNull().default(true),
  attendance: integer("attendance").default(0),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Kumbh Events ──
export const kumbhEvents = pgTable("kumbh_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  maxVolunteers: integer("max_volunteers").default(5000),
  attendanceThreshold: integer("attendance_threshold").default(90),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Sessions ──
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => kumbhEvents.id),
  name: varchar("name", { length: 255 }).notNull(),
  slot: sessionSlotEnum("slot").notNull().default("morning"),
  date: timestamp("date", { withTimezone: true }),
  venue: varchar("venue", { length: 255 }),
  capacity: integer("capacity").default(200),
  enrolled: integer("enrolled").default(0),
  attended: integer("attended").default(0),
  instructorId: uuid("instructor_id").references(() => users.id),
  status: sessionStatusEnum("status").notNull().default("scheduled"),
  timeStart: varchar("time_start", { length: 10 }),
  timeEnd: varchar("time_end", { length: 10 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Attendance Records ──
export const attendanceRecords = pgTable("attendance_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  userName: varchar("user_name", { length: 200 }),
  sessionId: uuid("session_id").references(() => sessions.id),
  eventId: uuid("event_id").references(() => kumbhEvents.id),
  status: attendanceStatusEnum("status").notNull().default("present"),
  checkInAt: timestamp("check_in_at", { withTimezone: true }),
  checkOutAt: timestamp("check_out_at", { withTimezone: true }),
  checkInMethod: varchar("check_in_method", { length: 50 }),
  qrData: text("qr_data"),
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
  overrideBy: uuid("override_by").references(() => users.id),
  overrideReason: text("override_reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Exams ──
export const exams = pgTable("exams", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").references(() => kumbhEvents.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: examTypeEnum("type").notNull(),
  status: examStatusEnum("status").notNull().default("draft"),
  durationMinutes: integer("duration_minutes").default(30),
  passingScore: integer("passing_score").default(50),
  maxAttempts: integer("max_attempts").default(2),
  questionCount: integer("question_count").default(15),
  instructions: text("instructions"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Questions ──
export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  examId: uuid("exam_id").references(() => exams.id),
  question: text("question").notNull(),
  options: json("options").$type<Record<string, string>>(),
  correctAnswer: varchar("correct_answer", { length: 10 }),
  difficulty: varchar("difficulty", { length: 20 }),
  category: varchar("category", { length: 100 }),
  explanation: text("explanation"),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Exam Attempts ──
export const examAttempts = pgTable("exam_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  examId: uuid("exam_id").references(() => exams.id),
  userId: uuid("user_id").references(() => users.id),
  userName: varchar("user_name", { length: 200 }),
  score: integer("score").default(0),
  totalQuestions: integer("total_questions").default(0),
  percentage: integer("percentage").default(0),
  isPassed: boolean("is_passed").default(false),
  answers: json("answers").$type<Record<string, string>>(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Certificates ──
export const certificates = pgTable("certificates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  certificateNumber: varchar("certificate_number", { length: 100 }).notNull(),
  eventId: uuid("event_id").references(() => kumbhEvents.id),
  eventName: varchar("event_name", { length: 255 }),
  volunteerName: varchar("volunteer_name", { length: 200 }),
  issueDate: timestamp("issue_date", { withTimezone: true }),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  status: certStatusEnum("status").notNull().default("pending"),
  type: varchar("type", { length: 100 }),
  grade: varchar("grade", { length: 10 }),
  score: integer("score"),
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── System Config ──
export const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value").notNull(),
  category: varchar("category", { length: 100 }).default("general"),
  description: text("description"),
  valueType: varchar("value_type", { length: 50 }).default("string"),
  minValue: integer("min_value"),
  maxValue: integer("max_value"),
  editableByAdmin: boolean("editable_by_admin").default(true),
  requiresRestart: boolean("requires_restart").default(false),
  updatedBy: varchar("updated_by", { length: 100 }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── QR Codes ──
export const qrCodes = pgTable("qr_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id),
  instructorId: uuid("instructor_id").references(() => users.id),
  qrData: text("qr_data").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Tents ──
export const tents = pgTable("tents", {
  id: uuid("id").primaryKey().defaultRandom(),
  tentNumber: varchar("tent_number", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  sector: varchar("sector", { length: 50 }).notNull().default("general"),
  gender: varchar("gender", { length: 20 }).notNull().default("male"),
  capacity: integer("capacity").notNull().default(24),
  occupied: integer("occupied").notNull().default(0),
  location: varchar("location", { length: 255 }),
  facilities: json("facilities").$type<string[]>(),
  notes: text("notes"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Sync Queue ──
export const syncQueue = pgTable("sync_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: varchar("entity_id", { length: 100 }),
  action: varchar("action", { length: 50 }),
  payload: json("payload"),
  status: varchar("status", { length: 50 }).default("pending"),
  retryCount: integer("retry_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
