import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import { db } from './db';
import { parseDemoToken } from './routers/auth';

// Context builder
export async function createContext(opts: { req: Request }) {
  const authHeader = opts.req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  let user = null;
  if (token && token.startsWith('demo_token_')) {
    const parsed = parseDemoToken(token);
    if (parsed) {
      user = parsed;
    }
  }

  return { db, token, req: opts.req, user };
}

type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: undefined,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: { ...shape.data, zodError: error.cause instanceof z.ZodError ? error.cause.flatten() : null },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure - requires valid token with user
export const authedProcedure = t.procedure.use(async function isAuthed(opts) {
  const { ctx } = opts;

  if (!ctx.token) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Missing authentication token' });
  }

  // Parse demo token
  if (ctx.token.startsWith('demo_token_')) {
    const userData = parseDemoToken(ctx.token);
    if (userData) {
      return opts.next({ ctx: { ...ctx, user: userData } });
    }
  }

  // Allow any demo token for backward compatibility
  if (ctx.token.startsWith('demo_token_')) {
    return opts.next({
      ctx: { ...ctx, user: { id: 'demo-user', role: 'volunteer', name: 'Demo User' } },
    });
  }

  throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid authentication token' });
});

// Admin-only procedure
export const adminProcedure = authedProcedure.use(async function isAdmin(opts) {
  const { ctx } = opts;
  const userRole = (ctx as any).user?.role;

  if (userRole !== 'admin' && userRole !== 'assessment_admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin or Assessment Admin access required' });
  }

  return opts.next({ ctx });
});

// Instructor procedure (instructors and admins)
export const instructorProcedure = authedProcedure.use(async function isInstructor(opts) {
  const { ctx } = opts;
  const userRole = (ctx as any).user?.role;

  if (userRole !== 'instructor' && userRole !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Instructor access required' });
  }

  return opts.next({ ctx });
});

export const createTRPCRouter = t.router;
export const mergeRouters = t.mergeRouters;
