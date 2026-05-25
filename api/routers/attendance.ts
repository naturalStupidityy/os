import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery, instructorQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { attendanceRecords, sessions, users } from "@db/schema";

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

  manualCheckIn: instructorQuery
    .input(z.object({
      sessionId: z.string(),
      eventId: z.string(),
      userId: z.string(),
      userName: z.string().optional(),
      status: z.enum(["present", "absent", "late", "excused"]).default("present"),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const now = new Date();

      // Check if an attendance record already exists for this user + session
      const existing = await db.select().from(attendanceRecords).where(
        and(
          eq(attendanceRecords.userId, input.userId),
          eq(attendanceRecords.sessionId, input.sessionId)
        )
      ).limit(1);

      let record;
      const wasPresent = existing.length > 0 && existing[0].status === "present";
      const isNowPresent = input.status === "present";

      if (existing.length > 0) {
        // Update existing record
        const updateData: any = {
          status: input.status,
          checkInMethod: "manual_override",
          overrideBy: ctx.user!.id,
          overrideReason: input.reason || `Manually marked ${input.status} by instructor`,
        };

        if (isNowPresent && !existing[0].checkInAt) {
          updateData.checkInAt = now;
        }

        const result = await db.update(attendanceRecords)
          .set(updateData)
          .where(eq(attendanceRecords.id, existing[0].id))
          .returning();

        record = result[0];
      } else {
        // Create new record
        const result = await db.insert(attendanceRecords).values({
          userId: input.userId,
          userName: input.userName,
          sessionId: input.sessionId,
          eventId: input.eventId,
          status: input.status,
          checkInAt: isNowPresent ? now : null,
          checkInMethod: "manual_override",
          overrideBy: ctx.user!.id,
          overrideReason: input.reason || `Manually marked ${input.status} by instructor`,
        }).returning();

        record = result[0];
      }

      // Update session attended count based on status change
      if (wasPresent && !isNowPresent) {
        // Went from present to non-present: decrement
        await db.update(sessions)
          .set({ attended: sql`greatest(0, ${sessions.attended} - 1)` })
          .where(eq(sessions.id, input.sessionId));
      } else if (!wasPresent && isNowPresent) {
        // Went from non-present to present: increment
        await db.update(sessions)
          .set({ attended: sql`${sessions.attended} + 1` })
          .where(eq(sessions.id, input.sessionId));
      }

      return {
        success: true,
        record,
        message: `Attendance marked as ${input.status}`,
      };
    }),

  // Get full roster for a session (all volunteers + their attendance status)
  getRoster: instructorQuery
    .input(z.object({ sessionId: z.string(), eventId: z.string().optional() }))
    .query(async ({ input }) => {
      const db = getDb();

      // Get all volunteers
      const allVolunteers = await db.select().from(users)
        .where(eq(users.role, "volunteer"));

      // Get existing attendance records for this session
      const records = await db.select().from(attendanceRecords)
        .where(eq(attendanceRecords.sessionId, input.sessionId));

      // Create a map of userId -> attendance record
      const recordMap = new Map();
      for (const r of records) {
        recordMap.set(r.userId, r);
      }

      // Merge: for each volunteer, include their attendance status
      const roster = allVolunteers.map((v) => {
        const record = recordMap.get(v.id);
        return {
          userId: v.id,
          userName: v.fullName || `${v.firstName || ''} ${v.lastName || ''}`.trim() || v.vid || 'Unknown',
          vid: v.vid,
          unit: v.unit,
          status: record ? record.status : "absent", // Default to absent if no record
          checkInAt: record ? record.checkInAt : null,
          checkInMethod: record ? record.checkInMethod : null,
          recordId: record ? record.id : null,
        };
      });

      return roster;
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
