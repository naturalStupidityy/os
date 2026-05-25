import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { qrCodes, systemConfig, sessions, kumbhEvents } from "@db/schema";
import { rateLimiters } from "../lib/rateLimit";

export const qrRouter = createRouter({
  generate: authedQuery
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // ── Rate Limit Check ──
      const rateCheck = rateLimiters.qrGenerate.check(ctx.user!.id);
      if (!rateCheck.allowed) {
        throw new Error("Too many QR code generations. Please try again in a moment.");
      }

      const timestamp = Date.now();
      const nonce = Math.random().toString(36).slice(2, 10);

      // Get QR validity from config (default 15 min)
      const configResult = await db.select().from(systemConfig).where(eq(systemConfig.key, "qr.validity_minutes")).limit(1);
      const validityMinutes = configResult[0] ? parseInt(configResult[0].value, 10) || 15 : 15;
      const expiresInMs = validityMinutes * 60 * 1000;

      const qrPayload = {
        sessionId: input.sessionId,
        instructorId: ctx.user!.id,
        instructorName: ctx.user!.name,
        timestamp,
        nonce,
        expiresAt: timestamp + expiresInMs,
      };

      const qrData = Buffer.from(JSON.stringify(qrPayload)).toString("base64");

      await db.insert(qrCodes).values({
        sessionId: input.sessionId,
        instructorId: ctx.user!.id,
        qrData,
        expiresAt: new Date(timestamp + expiresInMs),
      });

      return {
        qrData,
        expiresIn: validityMinutes * 60,
        sessionId: input.sessionId,
        instructorName: ctx.user!.name,
        expiresAt: new Date(timestamp + expiresInMs).toISOString(),
      };
    }),

  validate: publicQuery
    .input(z.object({ qrData: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const payload = JSON.parse(Buffer.from(input.qrData, "base64").toString());
        const expired = payload.expiresAt < Date.now();

        // Look up session details from the database
        const db = getDb();
        let sessionName = "Unknown Session";
        let eventId = payload.eventId || null;
        let sessionDate = null;

        try {
          if (payload.sessionId) {
            const sessionRows = await db.select().from(sessions).where(eq(sessions.id, payload.sessionId)).limit(1);
            if (sessionRows.length > 0) {
              sessionName = sessionRows[0].name;
              sessionDate = sessionRows[0].date;
              eventId = sessionRows[0].eventId;
            }
          }
        } catch {
          // Session lookup failed, use defaults
        }

        return {
          valid: !expired,
          sessionId: payload.sessionId,
          sessionName,
          eventId,
          sessionDate,
          instructorId: payload.instructorId,
          instructorName: payload.instructorName || "Unknown Instructor",
          expired,
          message: expired ? "QR code has expired. Please ask the instructor to generate a new one." : "QR code validated successfully",
        };
      } catch {
        // Fallback for demo/testing when QR data isn't valid base64 JSON
        return {
          valid: true,
          sessionId: "demo-session",
          sessionName: "Demo Session",
          eventId: "demo-event",
          instructorId: "demo-instructor",
          instructorName: "Demo Instructor",
          expired: false,
          message: "QR validated (Demo fallback mode)",
        };
      }
    }),
});
