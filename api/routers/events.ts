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
    .input(z.object({ eventId: z.string().optional() }))
    .query(async ({ input }) => {
      const db = getDb();
      if (input.eventId) {
        return db.select().from(sessions).where(eq(sessions.eventId, input.eventId));
      }
      // Return all sessions if no eventId provided
      return db.select().from(sessions);
    }),

  getSchedule: publicQuery
    .input(z.object({ eventId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const eventSessions = await db.select().from(sessions).where(eq(sessions.eventId, input.eventId));

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
