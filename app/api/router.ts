import { createRouter, publicQuery } from "./middleware";
import { authRouter } from "./routers/auth";
import { eventsRouter } from "./routers/events";
import { attendanceRouter } from "./routers/attendance";
import { examsRouter } from "./routers/exams";
import { certificatesRouter } from "./routers/certificates";
import { adminRouter } from "./routers/admin";
import { qrRouter } from "./routers/qr";
import { syncRouter } from "./routers/sync";
import { tentsRouter } from "./routers/tents";
import { registrationRouter } from "./routers/registration";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  events: eventsRouter,
  sessions: eventsRouter,
  attendance: attendanceRouter,
  exams: examsRouter,
  certificates: certificatesRouter,
  admin: adminRouter,
  qr: qrRouter,
  sync: syncRouter,
  tents: tentsRouter,
  registration: registrationRouter,
});

export type AppRouter = typeof appRouter;
