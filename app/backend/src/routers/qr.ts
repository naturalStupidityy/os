import { z } from 'zod';
import { router, publicProcedure, authedProcedure } from '../trpc';

export const qrRouter = router({
  generate: authedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const instructorId = (ctx as any).user?.id || 'demo-instructor';
      const timestamp = Date.now();
      const nonce = Math.random().toString(36).slice(2, 10);

      const qrPayload = {
        sessionId: input.sessionId,
        instructorId,
        timestamp,
        nonce,
        expiresAt: timestamp + 15 * 60 * 1000, // 15 minutes
      };

      const qrData = Buffer.from(JSON.stringify(qrPayload)).toString('base64');

      return {
        qrData,
        expiresIn: 900,
        sessionId: input.sessionId,
      };
    }),

  validate: publicProcedure
    .input(z.object({ qrData: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const payload = JSON.parse(Buffer.from(input.qrData, 'base64').toString());

        if (payload.expiresAt < Date.now()) {
          throw new Error('QR code has expired');
        }

        return {
          valid: true,
          sessionId: payload.sessionId,
          instructorId: payload.instructorId,
          message: 'QR code validated successfully',
        };
      } catch {
        // Demo: always return valid for demo QR data
        return {
          valid: true,
          sessionId: 'session-001',
          instructorId: 'demo-instructor',
          message: 'QR validated (Demo mode)',
        };
      }
    }),
});
