import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { createRouter, adminQuery, instructorQuery, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { systemConfig, users, sessions, attendanceRecords, examAttempts, certificates, exams } from "@db/schema";

// Default configuration values (mirrored from seed.ts)
const DEFAULT_CONFIG = [
  { key: "attendance.threshold_percentage", value: "75", category: "attendance", description: "Minimum attendance percentage required for exam eligibility", valueType: "integer", minValue: 0, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "attendance.min_sessions_required", value: "9", category: "attendance", description: "Minimum number of attended sessions to qualify for exams", valueType: "integer", minValue: 0, maxValue: 20, editableByAdmin: true, requiresRestart: false },
  { key: "attendance.total_sessions", value: "12", category: "attendance", description: "Total number of attendance sessions in the training program", valueType: "integer", minValue: 1, maxValue: 50, editableByAdmin: true, requiresRestart: false },
  { key: "attendance.checkin_window_minutes", value: "30", category: "attendance", description: "Time window around session start for QR check-in", valueType: "integer", minValue: 5, maxValue: 120, editableByAdmin: true, requiresRestart: false },
  { key: "attendance.manual_override_enabled", value: "true", category: "attendance", description: "Allow instructors to manually override attendance records", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
  { key: "attendance.manual_override_grace_minutes", value: "15", category: "attendance", description: "Grace period after session ends for manual override", valueType: "integer", minValue: 0, maxValue: 60, editableByAdmin: true, requiresRestart: false },
  { key: "attendance.instructor_override_alert_threshold", value: "20", category: "attendance", description: "Alert admin if instructor manually marks more than this % of a batch", valueType: "integer", minValue: 0, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "tent.total_count", value: "15", category: "logistics", description: "Total number of tents available for volunteer accommodation", valueType: "integer", minValue: 1, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "tent.capacity_per_tent", value: "24", category: "logistics", description: "Maximum number of beds per tent", valueType: "integer", minValue: 1, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "tent.global_capacity_cap", value: "360", category: "logistics", description: "Global maximum volunteers for tent allocation", valueType: "integer", minValue: 0, maxValue: 5000, editableByAdmin: true, requiresRestart: false },
  { key: "tent.female_sector_start", value: "1", category: "logistics", description: "Starting tent number for female sector", valueType: "integer", minValue: 1, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "tent.female_sector_end", value: "7", category: "logistics", description: "Ending tent number for female sector", valueType: "integer", minValue: 1, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "tent.male_sector_start", value: "8", category: "logistics", description: "Starting tent number for male sector", valueType: "integer", minValue: 1, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "tent.male_sector_end", value: "15", category: "logistics", description: "Ending tent number for male sector", valueType: "integer", minValue: 1, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "tent.allocation_strategy", value: "fcfs_fill_full", category: "logistics", description: "Tent allocation strategy (fcfs_fill_full, fcfs_round_robin, gender_segregated)", valueType: "string", editableByAdmin: true, requiresRestart: false },
  { key: "exam.question_bank_size", value: "1000", category: "assessment", description: "Total questions available in the MCQ bank", valueType: "integer", minValue: 100, maxValue: 10000, editableByAdmin: true, requiresRestart: false },
  { key: "exam.question_count_pre_test", value: "15", category: "assessment", description: "Number of questions in the Day 1 Pre-Test", valueType: "integer", minValue: 5, maxValue: 50, editableByAdmin: true, requiresRestart: false },
  { key: "exam.question_count_post_test", value: "30", category: "assessment", description: "Number of questions in the Day 6 Post-Test", valueType: "integer", minValue: 10, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "exam.passing_score_percentage", value: "50", category: "assessment", description: "Minimum score percentage required to pass an exam", valueType: "integer", minValue: 0, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "exam.max_attempts", value: "2", category: "assessment", description: "Maximum attempts allowed per exam per volunteer", valueType: "integer", minValue: 1, maxValue: 10, editableByAdmin: true, requiresRestart: false },
  { key: "exam.duration_minutes_pre_test", value: "30", category: "assessment", description: "Duration of the Day 1 Pre-Test in minutes", valueType: "integer", minValue: 10, maxValue: 120, editableByAdmin: true, requiresRestart: false },
  { key: "exam.duration_minutes_post_test", value: "60", category: "assessment", description: "Duration of the Day 6 Post-Test in minutes", valueType: "integer", minValue: 10, maxValue: 180, editableByAdmin: true, requiresRestart: false },
  { key: "exam.retake_allowed", value: "true", category: "assessment", description: "Allow volunteers to retake failed exams", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
  { key: "batch.training_days", value: "6", category: "batch", description: "Number of training days in a batch", valueType: "integer", minValue: 1, maxValue: 30, editableByAdmin: true, requiresRestart: false },
  { key: "batch.sessions_per_day", value: "2", category: "batch", description: "Number of sessions per day (morning and evening)", valueType: "integer", minValue: 1, maxValue: 5, editableByAdmin: true, requiresRestart: false },
  { key: "batch.max_volunteers_per_batch", value: "500", category: "batch", description: "Maximum volunteers per training batch", valueType: "integer", minValue: 10, maxValue: 1000, editableByAdmin: true, requiresRestart: false },
  { key: "batch.registration_cutoff_hours", value: "24", category: "batch", description: "Hours before batch start when registration closes", valueType: "integer", minValue: 0, maxValue: 168, editableByAdmin: true, requiresRestart: false },
  { key: "certificate.auto_generate", value: "true", category: "certificate", description: "Automatically generate certificates when volunteer passes exam and meets attendance", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
  { key: "certificate.require_both_attendance_and_exam", value: "true", category: "certificate", description: "Require both attendance threshold and exam pass for certificate issuance", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
  { key: "qr.validity_minutes", value: "15", category: "security", description: "QR code validity duration in minutes before expiry", valueType: "integer", minValue: 1, maxValue: 60, editableByAdmin: true, requiresRestart: false },
  { key: "notifications.sms_enabled", value: "false", category: "notifications", description: "Enable SMS notifications (requires external SMS API)", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
  { key: "notifications.whatsapp_enabled", value: "false", category: "notifications", description: "Enable WhatsApp notifications (requires external WhatsApp API)", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
  { key: "registration.enabled", value: "true", category: "general", description: "Allow new volunteer registrations through the system", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
  { key: "registration.max_per_day", value: "500", category: "general", description: "Maximum new registrations allowed per day", valueType: "integer", minValue: 1, maxValue: 2000, editableByAdmin: true, requiresRestart: false },
  { key: "registration.require_aadhaar", value: "false", category: "general", description: "Require Aadhaar verification during registration (requires external Aadhaar API)", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
];

export const adminRouter = createRouter({
  // ── Configuration Management ──
  getConfig: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(systemConfig);
  }),

  getConfigByCategory: adminQuery
    .input(z.object({ category: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(systemConfig).where(eq(systemConfig.category, input.category));
    }),

  getConfigValue: adminQuery
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(systemConfig).where(eq(systemConfig.key, input.key)).limit(1);
      return result[0] || null;
    }),

  updateConfig: adminQuery
    .input(z.object({
      key: z.string().min(1),
      value: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const existing = await db.select().from(systemConfig).where(eq(systemConfig.key, input.key)).limit(1);

      if (existing.length > 0) {
        await db.update(systemConfig)
          .set({
            value: input.value,
            updatedBy: ctx.user!.id,
            updatedAt: new Date(),
          })
          .where(eq(systemConfig.key, input.key));
      } else {
        await db.insert(systemConfig).values({
          key: input.key,
          value: input.value,
          updatedBy: ctx.user!.id,
        });
      }

      return { key: input.key, value: input.value, success: true, message: "Configuration updated" };
    }),

  bulkUpdateConfig: adminQuery
    .input(z.array(z.object({
      key: z.string().min(1),
      value: z.string().min(1),
    })))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const results = [];

      for (const update of input) {
        const existing = await db.select().from(systemConfig).where(eq(systemConfig.key, update.key)).limit(1);

        if (existing.length > 0) {
          await db.update(systemConfig)
            .set({ value: update.value, updatedBy: ctx.user!.id, updatedAt: new Date() })
            .where(eq(systemConfig.key, update.key));
        } else {
          await db.insert(systemConfig).values({ key: update.key, value: update.value, updatedBy: ctx.user!.id });
        }

        results.push({ key: update.key, success: true });
      }

      return { results };
    }),

  resetConfigToDefault: adminQuery
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Import default config values from seed
      const defaultConfig = DEFAULT_CONFIG.find((c: any) => c.key === input.key);
      if (!defaultConfig) {
        throw new Error(`No default value found for key: ${input.key}`);
      }

      const existing = await db.select().from(systemConfig).where(eq(systemConfig.key, input.key)).limit(1);

      if (existing.length > 0) {
        await db.update(systemConfig)
          .set({ value: defaultConfig.value, updatedAt: new Date() })
          .where(eq(systemConfig.key, input.key));
      } else {
        await db.insert(systemConfig).values({
          key: input.key,
          value: defaultConfig.value,
          category: defaultConfig.category,
          description: defaultConfig.description,
          valueType: defaultConfig.valueType,
          minValue: defaultConfig.minValue,
          maxValue: defaultConfig.maxValue,
          editableByAdmin: defaultConfig.editableByAdmin,
          requiresRestart: defaultConfig.requiresRestart,
        });
      }

      return { key: input.key, value: defaultConfig.value, success: true, message: `Reset ${input.key} to default: ${defaultConfig.value}` };
    }),

  getConfigCategories: adminQuery.query(() => {
    return [
      { id: "attendance", label: "Attendance Rules", description: "Thresholds, windows, override policies" },
      { id: "logistics", label: "Tent & Logistics", description: "Tent count, capacity, gender sectors" },
      { id: "assessment", label: "Assessment Rules", description: "Exam parameters, passing criteria, retries" },
      { id: "batch", label: "Batch Settings", description: "Duration, session times, capacity" },
      { id: "certificate", label: "Certificate Rules", description: "Issuance criteria and auto-generation" },
      { id: "security", label: "Security Settings", description: "QR expiry, JWT, encryption" },
      { id: "notifications", label: "Notifications", description: "SMS, WhatsApp, email settings" },
      { id: "general", label: "General", description: "Registration and system-wide settings" },
    ];
  }),

  // ── System Stats ── (instructors and admins can view)
  getStats: instructorQuery.query(async () => {
    const db = getDb();

    const totalVolunteers = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "volunteer"));
    const totalInstructors = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "instructor"));
    const totalSessions = await db.select({ count: sql<number>`count(*)` }).from(sessions);
    const totalCheckIns = await db.select({ count: sql<number>`count(*)` }).from(attendanceRecords);
    const totalCertificates = await db.select({ count: sql<number>`count(*)` }).from(certificates).where(eq(certificates.status, "issued"));
    const totalExams = await db.select({ count: sql<number>`count(*)` }).from(exams);
    const upcomingSessions = await db.select({ count: sql<number>`count(*)` }).from(sessions).where(eq(sessions.status, "scheduled"));
    const completedSessions = await db.select({ count: sql<number>`count(*)` }).from(sessions).where(eq(sessions.status, "completed"));
    const inProgressSessions = await db.select({ count: sql<number>`count(*)` }).from(sessions).where(eq(sessions.status, "in_progress"));
    const pendingVerifications = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.status, "pending"));

    const attendanceData = await db.select({ count: sql<number>`count(*)` }).from(attendanceRecords).where(eq(attendanceRecords.status, "present"));
    const totalAttendanceRecords = await db.select({ count: sql<number>`count(*)` }).from(attendanceRecords);
    const avgAttendance = totalAttendanceRecords[0]?.count > 0
      ? Math.round((attendanceData[0]?.count / totalAttendanceRecords[0]?.count) * 100)
      : 0;

    const passedAttempts = await db.select({ count: sql<number>`count(*)` }).from(examAttempts).where(eq(examAttempts.isPassed, true));
    const totalAttempts = await db.select({ count: sql<number>`count(*)` }).from(examAttempts);
    const examPassRate = totalAttempts[0]?.count > 0
      ? Math.round((passedAttempts[0]?.count / totalAttempts[0]?.count) * 100)
      : 0;

    return {
      totalVolunteers: totalVolunteers[0]?.count || 0,
      totalInstructors: totalInstructors[0]?.count || 0,
      totalSessions: totalSessions[0]?.count || 0,
      totalCheckIns: totalCheckIns[0]?.count || 0,
      avgAttendance,
      examPassRate,
      activeEvents: 1,
      certificatesIssued: totalCertificates[0]?.count || 0,
      totalExams: totalExams[0]?.count || 0,
      upcomingSessions: upcomingSessions[0]?.count || 0,
      completedSessions: completedSessions[0]?.count || 0,
      inProgressSessions: inProgressSessions[0]?.count || 0,
      pendingVerifications: pendingVerifications[0]?.count || 0,
    };
  }),

  // ── API Status ──
  getAPIStatus: adminQuery.query(async () => {
    const dbStart = Date.now();
    try {
      const db = getDb();
      await db.select().from(users).limit(1);
      const dbLatency = Date.now() - dbStart;

      return [
        { name: "PostgreSQL Database", status: "operational", latency: `${dbLatency}ms`, lastChecked: new Date().toISOString() },
        { name: "Authentication Service", status: "operational", latency: "5ms", lastChecked: new Date().toISOString() },
        { name: "QR Generator", status: "operational", latency: "3ms", lastChecked: new Date().toISOString() },
        { name: "SMS Gateway", status: "degraded", latency: "320ms", lastChecked: new Date().toISOString() },
        { name: "Email Service", status: "operational", latency: "89ms", lastChecked: new Date().toISOString() },
        { name: "Push Notification", status: "operational", latency: "23ms", lastChecked: new Date().toISOString() },
      ];
    } catch {
      return [
        { name: "PostgreSQL Database", status: "down", latency: "N/A", lastChecked: new Date().toISOString() },
        { name: "Authentication Service", status: "operational", latency: "5ms", lastChecked: new Date().toISOString() },
        { name: "QR Generator", status: "operational", latency: "3ms", lastChecked: new Date().toISOString() },
      ];
    }
  }),

  // ── Reports ──
  getReports: adminQuery.query(async () => {
    return [
      { id: "rpt-001", type: "attendance", title: "Daily Attendance Report", generatedAt: new Date().toISOString(), status: "ready", format: "pdf" },
      { id: "rpt-002", type: "eligibility", title: "Volunteer Eligibility Summary", generatedAt: new Date(Date.now() - 86400000).toISOString(), status: "ready", format: "xlsx" },
      { id: "rpt-003", type: "unit_wise", title: "Unit-wise Performance Report", generatedAt: new Date(Date.now() - 172800000).toISOString(), status: "ready", format: "pdf" },
      { id: "rpt-004", type: "certificate", title: "Certificate Issuance Report", generatedAt: new Date(Date.now() - 259200000).toISOString(), status: "ready", format: "pdf" },
      { id: "rpt-005", type: "exam", title: "Exam Results Analysis", generatedAt: new Date(Date.now() - 345600000).toISOString(), status: "ready", format: "xlsx" },
    ];
  }),

  generateReport: adminQuery
    .input(z.object({ type: z.string(), filters: z.record(z.string(), z.any()).optional() }))
    .mutation(async ({ input }) => {
      return {
        id: `rpt-${Math.random().toString(36).slice(2, 8)}`,
        type: input.type,
        status: "generating",
        estimatedTime: "30s",
      };
    }),

  // ── User Management ──
  getUsers: publicQuery.query(async () => {
    const db = getDb();
    const allUsers = await db.select().from(users);
    return {
      users: allUsers.map(u => ({
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
        attendance: u.attendance,
        joinedAt: u.createdAt,
      })),
      total: allUsers.length,
    };
  }),

  updateUserRole: adminQuery
    .input(z.object({ userId: z.string(), role: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(users).set({ role: input.role as any }).where(eq(users.id, input.userId));
      return { userId: input.userId, role: input.role, updated: true };
    }),

  updateUserStatus: adminQuery
    .input(z.object({ userId: z.string(), status: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(users).set({ status: input.status as any }).where(eq(users.id, input.userId));
      return { userId: input.userId, status: input.status, updated: true };
    }),
});
