import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { attendanceRecords, sessions } from "@db/schema";

export const attendanceRouter = createRouter({
  checkIn: authedQuery
    .input(z.object({
      sessionId: z.string(),
      eventId: z.string(),
      qrData: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user!.id;

      // Admins are exempt from attendance
      if (ctx.user!.role === "admin") {
        return {
          id: crypto.randomUUID(),
          userId,
          sessionId: input.sessionId,
          eventId: input.eventId,
          status: "exempt",
          checkInAt: new Date(),
          checkInMethod: "auto",
          skipped: true,
          message: "Attendance not required for admin role",
        };
      }

      // Check if already checked in
      const existing = await db.select().from(attendanceRecords).where(
        and(
          eq(attendanceRecords.userId, userId),
          eq(attendanceRecords.sessionId, input.sessionId)
        )
      ).limit(1);

      if (existing.length > 0) {
        return { ...existing[0], message: "Already checked in" };
      }

      const result = await db.insert(attendanceRecords).values({
        userId,
        sessionId: input.sessionId,
        eventId: input.eventId,
        status: "present",
        checkInAt: new Date(),
        checkInMethod: input.qrData ? "qr" : "manual",
        qrData: input.qrData || null,
        latitude: input.latitude?.toString() || null,
        longitude: input.longitude?.toString() || null,
      }).returning();

      // Update session attended count
      await db.update(sessions)
        .set({ attended: sql`${sessions.attended} + 1` })
        .where(eq(sessions.id, input.sessionId));

      return { ...result[0], message: "Attendance marked successfully" };
    }),

  manualCheckIn: authedQuery
    .input(z.object({
      sessionId: z.string(),
      eventId: z.string(),
      userId: z.string(),
      userName: z.string().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const result = await db.insert(attendanceRecords).values({
        userId: input.userId,
        userName: input.userName,
        sessionId: input.sessionId,
        eventId: input.eventId,
        status: "present",
        checkInAt: new Date(),
        checkInMethod: "manual_override",
        overrideBy: ctx.user!.id,
        overrideReason: input.reason || "Manual check-in by instructor",
      }).returning();

      // Update session attended count
      await db.update(sessions)
        .set({ attended: sql`${sessions.attended} + 1` })
        .where(eq(sessions.id, input.sessionId));

      return { ...result[0], message: "Manual attendance marked successfully" };
    }),

  getStats: publicQuery
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();

      const records = await db.select().from(attendanceRecords)
        .where(eq(attendanceRecords.sessionId, input.sessionId));

      const total = records.length;
      const present = records.filter(r => r.status === "present").length;
      const late = records.filter(r => r.status === "late").length;
      const excused = records.filter(r => r.status === "excused").length;

      const qrCount = records.filter(r => r.checkInMethod === "qr").length;
      const manualCount = records.filter(r => r.checkInMethod === "manual" || r.checkInMethod === "manual_override").length;

      return {
        total,
        present,
        absent: total - present - late - excused,
        late,
        excused,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
        byMethod: { qr: qrCount, manual: manualCount },
      };
    }),

  getMyAttendance: authedQuery
    .input(z.object({ eventId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user!.id;

      let query = db.select().from(attendanceRecords).where(eq(attendanceRecords.userId, userId));
      const records = await query;

      if (input?.eventId) {
        return records.filter(r => r.eventId === input.eventId);
      }

      return records;
    }),

  getSessionAttendance: publicQuery
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(attendanceRecords)
        .where(eq(attendanceRecords.sessionId, input.sessionId));
    }),
});
