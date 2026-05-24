import { z } from 'zod';
import { router, publicProcedure, authedProcedure } from '../trpc';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

// ── Role-specific demo users ──
// Each role gets a consistent demo user with appropriate permissions

function createDemoUser(role: string, overrides: Partial<typeof users.$inferSelect> = {}) {
  const roleProfiles: Record<string, Partial<typeof users.$inferSelect>> = {
    volunteer: {
      firstName: 'Rahul',
      lastName: 'Sharma',
      fullName: 'Rahul Sharma',
      email: 'volunteer@vkumbh.org',
      unit: 'Unit A',
      designation: 'Volunteer',
      vid: 'VK-2025-1001',
    },
    instructor: {
      firstName: 'Gp Capt',
      lastName: 'Kulkarni',
      fullName: 'Gp Capt Mahesh Kulkarni',
      email: 'instructor@vkumbh.org',
      unit: 'CHMES Training Wing',
      designation: 'Lead Instructor',
      vid: 'VK-2025-2001',
    },
    admin: {
      firstName: 'Air Cmde',
      lastName: 'Sathe',
      fullName: 'Air Cmde Nitin Sathe',
      email: 'admin@vkumbh.org',
      unit: 'CHMES HQ',
      designation: 'Training Director',
      vid: 'VK-2025-0001',
    },
    assessment_admin: {
      firstName: 'Dr.',
      lastName: 'Joshi',
      fullName: 'Dr. Prachi Joshi',
      email: 'assessment@vkumbh.org',
      unit: 'DES PU',
      designation: 'Assessment Coordinator',
      vid: 'VK-2025-3001',
    },
  };

  const profile = roleProfiles[role] || roleProfiles.volunteer;

  const baseUser = {
    id: crypto.randomUUID(),
    mobileNumber: '9876543210',
    status: 'active' as const,
    isActive: true,
    isVerified: true,
    gender: 'male',
    photoUrl: null,
    googleId: null,
    aadhaarEncrypted: null,
    verificationMethod: null,
    passwordHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...profile,
    role: role as any,
    ...overrides,
  };

  return baseUser;
}

// Generate demo token with user info embedded
function createDemoToken(user: any): string {
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    role: user.role,
    name: user.fullName || `${user.firstName} ${user.lastName}`,
    firstName: user.firstName,
    lastName: user.lastName,
    vid: user.vid,
  })).toString('base64');
  return `demo_token_${payload}`;
}

// Parse demo token to extract user info
export function parseDemoToken(token: string): any {
  if (!token.startsWith('demo_token_')) return null;
  try {
    const payload = token.slice('demo_token_'.length);
    const userData = JSON.parse(Buffer.from(payload, 'base64').toString());
    return userData;
  } catch {
    return null;
  }
}

// Demo OTP store (in-memory for local dev)
const otpStore = new Map<string, { otp: string; phone: string; role: string; expires: number }>();

export const authRouter = router({
  // ── Request OTP ──
  requestOTP: publicProcedure
    .input(
      z.object({
        phone: z.string().min(10).max(15),
        role: z.enum(['volunteer', 'instructor', 'admin', 'assessment_admin']).optional().default('volunteer'),
      })
    )
    .mutation(async ({ input }) => {
      const otp = '123456'; // Demo OTP - always 123456 for testing
      const requestId = crypto.randomUUID();
      const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

      otpStore.set(requestId, { otp, phone: input.phone, role: input.role, expires });

      console.log(`[DEMO OTP] Phone: ${input.phone}, Role: ${input.role}, OTP: ${otp}, RequestId: ${requestId}`);

      return {
        requestId,
        expiresIn: 600,
        message: `OTP sent to ${input.phone} (Demo: use 123456)`,
      };
    }),

  // ── Verify OTP ──
  verifyOTP: publicProcedure
    .input(
      z.object({
        phone: z.string().min(10).max(15),
        otp: z.string().min(4).max(6),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Find OTP session by phone number
      let foundEntry: [string, { otp: string; phone: string; role: string; expires: number }] | undefined;
      for (const entry of otpStore.entries()) {
        if (entry[1].phone === input.phone) {
          foundEntry = entry;
          break;
        }
      }

      // Determine role (from OTP session or default to volunteer)
      const role = foundEntry?.[1]?.role || 'volunteer';

      // Validate OTP (always accept 123456 as demo)
      const isValid = input.otp === '123456' || (foundEntry !== undefined && input.otp === foundEntry[1].otp);

      if (!isValid) {
        throw new Error('Invalid OTP');
      }

      // Clean up OTP
      if (foundEntry) {
        otpStore.delete(foundEntry[0]);
      }

      // Create role-specific demo user
      const demoUser = createDemoUser(role, {
        mobileNumber: input.phone,
      });

      // Try to insert into DB for persistence
      try {
        const existingUsers = await ctx.db
          .select()
          .from(users)
          .where(eq(users.mobileNumber, input.phone))
          .limit(1);

        let dbUser;
        if (existingUsers.length > 0) {
          // Update role if changed
          dbUser = existingUsers[0];
          if (dbUser.role !== role) {
            await ctx.db.update(users).set({ role }).where(eq(users.id, dbUser.id));
            dbUser.role = role;
          }
        } else {
          const result = await ctx.db.insert(users).values(demoUser).returning();
          dbUser = result[0];
        }

        const token = createDemoToken(dbUser);

        return {
          user: {
            id: dbUser.id,
            vid: dbUser.vid,
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            fullName: dbUser.fullName,
            email: dbUser.email,
            mobileNumber: dbUser.mobileNumber,
            role: dbUser.role,
            status: dbUser.status,
            isVerified: dbUser.isVerified,
            photoUrl: dbUser.photoUrl,
            unit: dbUser.unit,
            designation: dbUser.designation,
            gender: dbUser.gender,
          },
          token,
          message: 'Login successful',
        };
      } catch (dbError) {
        // Fallback: return demo user without DB
        console.warn('[Auth] DB unavailable, returning demo user:', dbError);
        const token = createDemoToken(demoUser);
        return {
          user: {
            id: demoUser.id,
            vid: demoUser.vid,
            firstName: demoUser.firstName,
            lastName: demoUser.lastName,
            fullName: demoUser.fullName,
            email: demoUser.email,
            mobileNumber: demoUser.mobileNumber,
            role: demoUser.role,
            status: demoUser.status,
            isVerified: demoUser.isVerified,
            photoUrl: demoUser.photoUrl,
            unit: demoUser.unit,
            designation: demoUser.designation,
            gender: demoUser.gender,
          },
          token,
          message: 'Login successful (Demo mode)',
        };
      }
    }),

  // ── Role-based Demo Login (for testing without OTP) ──
  demoLogin: publicProcedure
    .input(
      z.object({
        role: z.enum(['volunteer', 'instructor', 'admin', 'assessment_admin']).default('volunteer'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const demoUser = createDemoUser(input.role, {
        mobileNumber: `987654${Math.floor(Math.random() * 9000) + 1000}`,
      });

      try {
        const result = await ctx.db.insert(users).values(demoUser).onConflictDoNothing().returning();
        const user = result[0] || demoUser;
        const token = createDemoToken(user);

        return {
          user: {
            id: user.id,
            vid: user.vid,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            email: user.email,
            mobileNumber: user.mobileNumber,
            role: user.role,
            status: user.status,
            isVerified: user.isVerified,
            photoUrl: user.photoUrl,
            unit: user.unit,
            designation: user.designation,
            gender: user.gender,
          },
          token,
          message: `Logged in as ${input.role}`,
        };
      } catch {
        const token = createDemoToken(demoUser);
        return {
          user: {
            id: demoUser.id,
            vid: demoUser.vid,
            firstName: demoUser.firstName,
            lastName: demoUser.lastName,
            fullName: demoUser.fullName,
            email: demoUser.email,
            mobileNumber: demoUser.mobileNumber,
            role: demoUser.role,
            status: demoUser.status,
            isVerified: demoUser.isVerified,
            photoUrl: demoUser.photoUrl,
            unit: demoUser.unit,
            designation: demoUser.designation,
            gender: demoUser.gender,
          },
          token,
          message: `Logged in as ${input.role} (Demo mode)`,
        };
      }
    }),

  // ── Get current user ──
  me: authedProcedure.query(async ({ ctx }) => {
    const userData = (ctx as any).user;
    if (!userData) {
      throw new Error('Not authenticated');
    }

    // Return user from database if possible
    try {
      const dbUsers = await ctx.db
        .select()
        .from(users)
        .where(eq(users.id, userData.id))
        .limit(1);

      if (dbUsers.length > 0) {
        const user = dbUsers[0];
        return {
          id: user.id,
          vid: user.vid,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          email: user.email,
          mobileNumber: user.mobileNumber,
          role: user.role,
          status: user.status,
          isVerified: user.isVerified,
          photoUrl: user.photoUrl,
          unit: user.unit,
          designation: user.designation,
          gender: user.gender,
        };
      }
    } catch {
      // DB unavailable, return from token
    }

    return userData;
  }),

  // ── Logout ──
  logout: authedProcedure.mutation(async () => {
    return { success: true, message: 'Logged out' };
  }),

  // ── Refresh token ──
  refreshToken: authedProcedure.mutation(async ({ ctx }) => {
    const userData = (ctx as any).user;
    if (!userData) {
      throw new Error('Not authenticated');
    }

    const token = createDemoToken(userData);
    return { token };
  }),
});
