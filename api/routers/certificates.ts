import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { certificates } from "@db/schema";

export const certificatesRouter = createRouter({
  getMyCertificates: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(certificates).where(eq(certificates.userId, ctx.user!.id));
  }),

  download: publicQuery
    .input(z.object({ certificateId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(certificates).where(eq(certificates.id, input.certificateId)).limit(1);
      if (result.length === 0) {
        throw new Error("Certificate not found");
      }
      return {
        certificate: result[0],
        message: "Certificate download ready",
      };
    }),

  generate: authedQuery
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const certNumber = `VK-2025-CERT-${String(Math.floor(Math.random() * 9000) + 1000)}`;

      const result = await db.insert(certificates).values({
        userId: ctx.user!.id,
        certificateNumber: certNumber,
        eventId: input.eventId,
        status: "pending",
        volunteerName: ctx.user!.name,
        issuedAt: new Date(),
      }).returning();

      return result[0];
    }),
});
