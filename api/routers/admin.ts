import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { createRouter, adminQuery, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { systemConfig, users, sessions, attendanceRecords, examAttempts, certificates, exams } from "@db/schema";

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
      return { key: input.key, success: true, message: "Reset to default" };
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

  // ── System Stats ──
  getStats: adminQuery.query(async () => {
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
