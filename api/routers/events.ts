import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { kumbhEvents, sessions } from "@db/schema";

export const eventsRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(kumbhEvents);
  }),

  getById: publicQuery
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(kumbhEvents).where(eq(kumbhEvents.id, input.id)).limit(1);
      return result[0] || null;
    }),

  getSessions: publicQuery
    .input(z.object({ eventId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const eventId = input?.eventId;
      if (eventId) {
        return db.select().from(sessions).where(eq(sessions.eventId, eventId));
      }
      // Return all sessions if no eventId provided
      return db.select().from(sessions);
    }),

  getSchedule: publicQuery
    .input(z.object({ eventId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const eventId = input?.eventId;
      let eventSessions;
      if (eventId) {
        // Try to find sessions by the provided eventId
        eventSessions = await db.select().from(sessions).where(eq(sessions.eventId, eventId));
        // If no sessions found and eventId doesn't look like a UUID, try getting all sessions
        if (eventSessions.length === 0 && !eventId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          eventSessions = await db.select().from(sessions);
        }
      } else {
        // No eventId provided - return all sessions grouped by date
        eventSessions = await db.select().from(sessions);
      }

      const dateMap = new Map<string, typeof eventSessions>();
      for (const session of eventSessions) {
        const dateKey = session.date ? new Date(session.date).toISOString().split("T")[0] : "unknown";
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, []);
        }
        dateMap.get(dateKey)!.push(session);
      }

      let day = 1;
      const schedule: Array<{
        date: string;
        day: number;
        sessions: typeof eventSessions;
        hasExam: boolean;
        examType: string;
      }> = [];

      for (const [date, daySessions] of dateMap) {
        schedule.push({
          date,
          day: day++,
          sessions: daySessions,
          hasExam: day === 1 || day === 5,
          examType: day === 1 ? "pre_test" : day === 5 ? "post_test" : "",
        });
      }

      return schedule;
    }),

  getSession: publicQuery
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(sessions).where(eq(sessions.id, input.sessionId)).limit(1);
      return result[0] || null;
    }),
});
