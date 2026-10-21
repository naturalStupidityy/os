import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { certificates } from "@db/schema";
import { checkCertificateEligibility, autoIssueCertificate } from "../lib/businessLogic";

export const certificatesRouter = createRouter({
  // ── Get my certificates ──
  getMyCertificates: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(certificates).where(eq(certificates.userId, ctx.user!.id));
  }),

  // ── Check if I'm eligible for a certificate ──
  checkEligibility: authedQuery.query(async ({ ctx }) => {
    return checkCertificateEligibility(ctx.user!.id);
  }),

  // ── Download certificate ──
  download: publicQuery
    .input(z.object({ certificateId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(certificates).where(eq(certificates.id, input.certificateId)).limit(1);
      if (result.length === 0) {
        throw new Error("Certificate not found");
      }

      const cert = result[0];

      // Build certificate data for download
      const certificateData = {
        certificateNumber: cert.certificateNumber,
        volunteerName: cert.volunteerName,
        eventName: cert.eventName,
        grade: cert.grade,
        score: cert.score,
        issueDate: cert.issueDate ? new Date(cert.issueDate).toLocaleDateString() : "N/A",
        validUntil: cert.validUntil ? new Date(cert.validUntil).toLocaleDateString() : "N/A",
        status: cert.status,
        issuedBy: "VKumbh Training Authority",
      };

      return {
        certificate: certificateData,
        message: "Certificate download ready",
      };
    }),

  // ── Request certificate (manual trigger) ──
  request: authedQuery
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const result = await autoIssueCertificate(ctx.user!.id, input.eventId);
      return result;
    }),
});
