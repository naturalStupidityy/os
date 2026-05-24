import { z } from 'zod';
import { router, publicProcedure, authedProcedure } from '../trpc';
import { kumbhEvents, sessions, attendanceRecords } from '../db/schema';
import { eq, and, gte } from 'drizzle-orm';

// Demo data for events
const demoEvents = [
  {
    id: 'event-001',
    name: 'Kumbh Mela 2025 - Prayagraj',
    location: 'Prayagraj, Uttar Pradesh',
    startDate: new Date('2025-01-13'),
    endDate: new Date('2025-02-26'),
    status: 'active',
    configOverrides: { maxVolunteers: 5000, attendanceThreshold: 90 },
  },
  {
    id: 'event-002',
    name: 'Maha Kumbh 2025 - Special Session',
    location: 'Triveni Sangam, Prayagraj',
    startDate: new Date('2025-02-01'),
    endDate: new Date('2025-02-15'),
    status: 'upcoming',
    configOverrides: { maxVolunteers: 2000, attendanceThreshold: 85 },
  },
];

const demoSessions = [
  {
    id: 'session-001',
    eventId: 'event-001',
    name: 'Crowd Management Training - Day 1',
    slot: 'morning' as const,
    date: new Date('2025-01-15'),
    instructorId: null,
    venue: 'Sector 7 Training Ground',
    capacity: 200,
    status: 'completed',
  },
  {
    id: 'session-002',
    eventId: 'event-001',
    name: 'First Aid & Emergency Response',
    slot: 'afternoon' as const,
    date: new Date('2025-01-16'),
    instructorId: null,
    venue: 'Medical Center Block A',
    capacity: 150,
    status: 'in_progress',
  },
  {
    id: 'session-003',
    eventId: 'event-001',
    name: 'Disaster Management & Evacuation',
    slot: 'morning' as const,
    date: new Date('2025-01-17'),
    instructorId: null,
    venue: 'Command Center Hall',
    capacity: 100,
    status: 'scheduled',
  },
  {
    id: 'session-004',
    eventId: 'event-001',
    name: 'Communication Protocols',
    slot: 'evening' as const,
    date: new Date('2025-01-18'),
    instructorId: null,
    venue: 'Digital Learning Center',
    capacity: 250,
    status: 'scheduled',
  },
];

export const eventsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    // Try to get from DB, fallback to demo data
    try {
      const dbEvents = await ctx.db.select().from(kumbhEvents);
      if (dbEvents.length > 0) return dbEvents;
    } catch {
      // Fallback to demo
    }
    return demoEvents;
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const result = await ctx.db
          .select()
          .from(kumbhEvents)
          .where(eq(kumbhEvents.id, input.id))
          .limit(1);
        if (result.length > 0) return result[0];
      } catch {
        // Fallback
      }
      return demoEvents.find((e) => e.id === input.id) || demoEvents[0];
    }),

  getSessions: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const result = await ctx.db
          .select()
          .from(sessions)
          .where(eq(sessions.eventId, input.eventId));
        if (result.length > 0) return result;
      } catch {
        // Fallback
      }
      return demoSessions.filter((s) => s.eventId === input.eventId);
    }),

  getSchedule: publicProcedure
    .input(z.object({ eventId: z.string() }))
    .query(async ({ input }) => {
      // Return daywise schedule
      const schedule = [
        {
          date: '2025-01-15',
          day: 1,
          sessions: [demoSessions[0]],
          hasExam: true,
          examType: 'pre_test',
        },
        {
          date: '2025-01-16',
          day: 2,
          sessions: [demoSessions[1]],
          hasExam: false,
        },
        {
          date: '2025-01-17',
          day: 3,
          sessions: [demoSessions[2]],
          hasExam: false,
        },
        {
          date: '2025-01-18',
          day: 4,
          sessions: [demoSessions[3]],
          hasExam: false,
        },
        {
          date: '2025-01-20',
          day: 6,
          sessions: [],
          hasExam: true,
          examType: 'post_test',
        },
      ];
      return schedule;
    }),

  getSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      return (
        demoSessions.find((s) => s.id === input.sessionId) || demoSessions[0]
      );
    }),
});
