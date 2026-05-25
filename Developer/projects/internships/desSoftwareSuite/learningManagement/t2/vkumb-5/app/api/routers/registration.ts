import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { users } from "@db/schema";
import { rateLimiters, getClientIdentifier } from "../lib/rateLimit";

function generateVID(): string {
  const prefix = "1";
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `VK-2025-${prefix}${random}`;
}

export const registrationRouter = createRouter({
  // ── Register a new volunteer ──
  register: publicQuery
    .input(z.object({
      firstName: z.string().min(1).max(100, "First name is required"),
      lastName: z.string().min(1).max(100, "Last name is required"),
      email: z.string().email("Invalid email address").optional().or(z.literal("")),
      mobileNumber: z.string().min(10).max(15, "Phone number must be 10-15 digits"),
      gender: z.enum(["male", "female", "other"]),
      unit: z.string().min(1).max(200, "Unit is required"),
      designation: z.string().max(200).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // ── Rate Limit Check ──
      const clientId = getClientIdentifier(ctx.req);
      const rateLimitKey = input.mobileNumber || clientId;
      const rateCheck = rateLimiters.registration.check(rateLimitKey);
      if (!rateCheck.allowed) {
        throw new Error("Too many registration attempts. Please try again later.");
      }

      // ── Check for duplicate phone number ──
      const existingPhone = await db
        .select()
        .from(users)
        .where(eq(users.mobileNumber, input.mobileNumber))
        .limit(1);

      if (existingPhone.length > 0) {
        throw new Error("A volunteer with this phone number is already registered.");
      }

      // ── Check for duplicate email (if provided) ──
      if (input.email) {
        const existingEmail = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (existingEmail.length > 0) {
          throw new Error("A volunteer with this email is already registered.");
        }
      }

      // ── Generate unique VID ──
      let vid = generateVID();
      let vidExists = true;
      let attempts = 0;
      while (vidExists && attempts < 10) {
        const existing = await db.select().from(users).where(eq(users.vid, vid)).limit(1);
        vidExists = existing.length > 0;
        if (vidExists) {
          vid = generateVID();
        }
        attempts++;
      }

      if (vidExists) {
        throw new Error("Unable to generate unique volunteer ID. Please try again.");
      }

      // ── Insert volunteer ──
      const fullName = `${input.firstName} ${input.lastName}`.trim();
      const result = await db.insert(users).values({
        vid,
        firstName: input.firstName,
        lastName: input.lastName,
        fullName,
        email: input.email || `${vid.toLowerCase()}@vkumbh.org`,
        mobileNumber: input.mobileNumber,
        role: "volunteer",
        gender: input.gender,
        unit: input.unit,
        designation: input.designation || "Volunteer",
        isVerified: true,
        status: "active",
        isActive: true,
        attendance: 0,
      }).returning();

      const user = result[0];

      return {
        success: true,
        volunteer: {
          id: user.id,
          vid: user.vid,
          fullName: user.fullName,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          mobileNumber: user.mobileNumber,
          gender: user.gender,
          unit: user.unit,
          designation: user.designation,
          status: user.status,
          role: user.role,
        },
        message: `Registration successful! Your Volunteer ID is ${vid}. Please save this for your records.`,
      };
    }),

  // ── Check if phone number is already registered ──
  checkPhone: publicQuery
    .input(z.object({
      mobileNumber: z.string().min(10).max(15),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.mobileNumber, input.mobileNumber))
        .limit(1);

      return {
        exists: existing.length > 0,
        vid: existing[0]?.vid || null,
      };
    }),
});
