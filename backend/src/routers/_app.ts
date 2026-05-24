import { router } from '../trpc';
import { authRouter } from './auth';
import { eventsRouter } from './events';
import { attendanceRouter } from './attendance';
import { examsRouter } from './exams';
import { certificatesRouter } from './certificates';
import { adminRouter } from './admin';
import { qrRouter } from './qr';

export const appRouter = router({
  auth: authRouter,
  events: eventsRouter,
  sessions: eventsRouter, // alias
  attendance: attendanceRouter,
  exams: examsRouter,
  certificates: certificatesRouter,
  admin: adminRouter,
  qr: qrRouter,
});

// Export type definition for the API
export type AppRouter = typeof appRouter;
