import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

// Authenticated procedure - requires valid token
export const authedQuery = t.procedure.use(async function isAuthed(opts) {
  if (!opts.ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  return opts.next({
    ctx: { ...opts.ctx, user: opts.ctx.user },
  });
});

// Admin-only procedure
export const adminQuery = authedQuery.use(async function isAdmin(opts) {
  const role = opts.ctx.user?.role;
  if (role !== "admin" && role !== "assessment_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return opts.next({ ctx: opts.ctx });
});

// Instructor procedure (instructors and admins)
export const instructorQuery = authedQuery.use(async function isInstructor(opts) {
  const role = opts.ctx.user?.role;
  if (role !== "instructor" && role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Instructor access required" });
  }
  return opts.next({ ctx: opts.ctx });
});
