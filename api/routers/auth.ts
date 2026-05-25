import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { createToken } from "../lib/auth";
import { users } from "@db/schema";

// Demo OTP store (in-memory for dev/demo)
const otpStore = new Map<string, { otp: string; phone: string; role: string; expires: number }>();

function generateVID(role: string): string {
  const prefix = role === "admin" ? "0" : role === "instructor" ? "2" : role === "assessment_admin" ? "3" : "1";
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `VK-2025-${prefix}${random}`;
}

export const authRouter = createRouter({
  requestOTP: publicQuery
    .input(z.object({
      phone: z.string().min(10).max(15),
      role: z.enum(["volunteer", "instructor", "admin", "assessment_admin"]).default("volunteer"),
    }))
    .mutation(async ({ input }) => {
      const otp = "123456"; // Demo OTP
      const requestId = crypto.randomUUID();
      const expires = Date.now() + 10 * 60 * 1000;
      otpStore.set(requestId, { otp, phone: input.phone, role: input.role, expires });
      return { requestId, expiresIn: 600, message: `OTP sent to ${input.phone} (Demo: use 123456)` };
    }),

  verifyOTP: publicQuery
    .input(z.object({
      phone: z.string().min(10).max(15),
      otp: z.string().min(4).max(6),
      role: z.enum(["volunteer", "instructor", "admin", "assessment_admin"]).optional(),
    }))
    .mutation(async ({ input }) => {
      // Validate OTP - always accept 123456 for demo
      if (input.otp !== "123456") {
        throw new Error("Invalid OTP");
      }

      const db = getDb();
      const role = input.role || "volunteer";

      // Check if user exists by phone
      const existingUsers = await db.select().from(users).where(eq(users.mobileNumber, input.phone)).limit(1);

      let user;
      if (existingUsers.length > 0) {
        user = existingUsers[0];
        // Update role if changed
        if (user.role !== role) {
          await db.update(users).set({ role }).where(eq(users.id, user.id));
          user.role = role;
        }
      } else {
        // Create new user with anonymized name based on role
        let fullName: string;
        let firstName: string;
        let lastName: string;

        if (role === "admin") {
          fullName = "Admin";
          firstName = "Admin";
          lastName = "";
        } else if (role === "instructor") {
          fullName = "Instructor";
          firstName = "Instructor";
          lastName = "";
        } else if (role === "assessment_admin") {
          fullName = "Assessment Admin";
          firstName = "Assessment";
          lastName = "Admin";
        } else {
          // Volunteer - get count for numbering
          const volCount = await db.select().from(users).where(eq(users.role, "volunteer"));
          const nextNum = volCount.length + 1;
          fullName = `Volunteer ${nextNum}`;
          firstName = "Volunteer";
          lastName = String(nextNum);
        }

        const newUser = {
          vid: generateVID(role),
          fullName,
          firstName,
          lastName,
          email: `${role}${Date.now()}@vkumbh.org`,
          mobileNumber: input.phone,
          role: role as any,
          unit: "General",
          designation: role === "admin" ? "Administrator" : role === "instructor" ? "Instructor" : role === "assessment_admin" ? "Assessment Coordinator" : "Volunteer",
          gender: "male",
          isVerified: true,
          status: "active" as const,
          isActive: true,
        };

        const result = await db.insert(users).values(newUser).returning();
        user = result[0];
      }

      const token = await createToken({
        id: user.id,
        role: user.role,
        name: user.fullName || "User",
      });

      return {
        user: {
          id: user.id,
          vid: user.vid,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          name: user.fullName,
          email: user.email,
          mobileNumber: user.mobileNumber,
          phone: user.mobileNumber,
          role: user.role,
          status: user.status,
          isActive: user.isActive,
          isVerified: user.isVerified,
          avatar: user.photoUrl,
          photoUrl: user.photoUrl,
          unit: user.unit,
          designation: user.designation,
          gender: user.gender,
        },
        token,
        message: "Login successful",
      };
    }),

  demoLogin: publicQuery
    .input(z.object({
      role: z.enum(["volunteer", "instructor", "admin", "assessment_admin"]).default("volunteer"),
    }).optional())
    .mutation(async ({ input }) => {
      const db = getDb();
      const role = input?.role || "volunteer";

      // Find a pre-seeded user of this role
      const existingUsers = await db.select().from(users).where(eq(users.role, role)).limit(1);

      if (existingUsers.length === 0) {
        throw new Error(`No ${role} user found. Please run db:seed first.`);
      }

      const user = existingUsers[0];

      const token = await createToken({
        id: user.id,
        role: user.role,
        name: user.fullName || "User",
      });

      return {
        user: {
          id: user.id,
          vid: user.vid,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          name: user.fullName,
          email: user.email,
          mobileNumber: user.mobileNumber,
          phone: user.mobileNumber,
          role: user.role,
          status: user.status,
          isActive: user.isActive,
          isVerified: user.isVerified,
          avatar: user.photoUrl,
          photoUrl: user.photoUrl,
          unit: user.unit,
          designation: user.designation,
          gender: user.gender,
        },
        token,
        message: `Logged in as ${role}`,
      };
    }),

  me: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const dbUsers = await db.select().from(users).where(eq(users.id, ctx.user!.id)).limit(1);

    if (dbUsers.length === 0) {
      throw new Error("User not found");
    }

    const user = dbUsers[0];
    return {
      id: user.id,
      vid: user.vid,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      name: user.fullName,
      email: user.email,
      mobileNumber: user.mobileNumber,
      phone: user.mobileNumber,
      role: user.role,
      status: user.status,
      isActive: user.isActive,
      isVerified: user.isVerified,
      avatar: user.photoUrl,
      photoUrl: user.photoUrl,
      unit: user.unit,
      designation: user.designation,
      gender: user.gender,
    };
  }),

  logout: authedQuery.mutation(async () => {
    return { success: true, message: "Logged out" };
  }),
});
