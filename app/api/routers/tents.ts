import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { tents } from "@db/schema";

export const tentsRouter = createRouter({
  // ── List all tents ──
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(tents).orderBy(tents.tentNumber);
  }),

  // ── Get single tent ──
  getById: publicQuery
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(tents).where(eq(tents.id, input.id)).limit(1);
      return result[0] || null;
    }),

  // ── Create tent ──
  create: adminQuery
    .input(z.object({
      tentNumber: z.string().min(1).max(20),
      name: z.string().optional(),
      sector: z.enum(["male", "female", "general", "mixed"]).default("general"),
      gender: z.enum(["male", "female", "mixed"]).default("male"),
      capacity: z.number().int().min(1).max(100).default(24),
      location: z.string().optional(),
      facilities: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Check for duplicate tent number
      const existing = await db.select().from(tents).where(eq(tents.tentNumber, input.tentNumber)).limit(1);
      if (existing.length > 0) {
        throw new Error(`Tent number ${input.tentNumber} already exists`);
      }

      const result = await db.insert(tents).values({
        tentNumber: input.tentNumber,
        name: input.name || `Tent ${input.tentNumber}`,
        sector: input.sector,
        gender: input.gender,
        capacity: input.capacity,
        location: input.location,
        facilities: input.facilities || [],
        notes: input.notes,
        status: "active",
      }).returning();

      return result[0];
    }),

  // ── Update tent (inline editing) ──
  update: adminQuery
    .input(z.object({
      id: z.string(),
      tentNumber: z.string().min(1).max(20).optional(),
      name: z.string().optional(),
      sector: z.enum(["male", "female", "general", "mixed"]).optional(),
      gender: z.enum(["male", "female", "mixed"]).optional(),
      capacity: z.number().int().min(1).max(100).optional(),
      occupied: z.number().int().min(0).optional(),
      location: z.string().optional(),
      facilities: z.array(z.string()).optional(),
      notes: z.string().optional(),
      status: z.enum(["active", "inactive", "maintenance"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...updates } = input;

      // Ensure occupied doesn't exceed capacity
      if (updates.occupied !== undefined && updates.capacity !== undefined) {
        if (updates.occupied > updates.capacity) {
          throw new Error("Occupied count cannot exceed capacity");
        }
      }

      // If only updating occupied, check against current capacity
      if (updates.occupied !== undefined && updates.capacity === undefined) {
        const current = await db.select().from(tents).where(eq(tents.id, id)).limit(1);
        if (current.length > 0 && updates.occupied > current[0].capacity) {
          throw new Error("Occupied count cannot exceed capacity");
        }
      }

      const result = await db.update(tents)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(tents.id, id))
        .returning();

      return result[0];
    }),

  // ── Delete tent ──
  delete: adminQuery
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(tents).where(eq(tents.id, input.id));
      return { success: true, message: "Tent deleted successfully" };
    }),

  // ── Bulk create tents ──
  bulkCreate: adminQuery
    .input(z.object({
      count: z.number().int().min(1).max(100).default(15),
      capacityPerTent: z.number().int().min(1).max(100).default(24),
      femaleSectorEnd: z.number().int().min(1).max(100).default(7),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const created = [];

      for (let i = 1; i <= input.count; i++) {
        const tentNumber = `T-${String(i).padStart(3, '0')}`;
        const gender = i <= input.femaleSectorEnd ? "female" : "male";
        const sector = i <= input.femaleSectorEnd ? "female" : "male";

        // Check if tent already exists
        const existing = await db.select().from(tents).where(eq(tents.tentNumber, tentNumber)).limit(1);
        if (existing.length === 0) {
          const result = await db.insert(tents).values({
            tentNumber,
            name: `Tent ${i}`,
            sector,
            gender,
            capacity: input.capacityPerTent,
            location: `Sector ${sector === "female" ? "A" : "B"}`,
            facilities: ["Beds", "Lighting", "Storage"],
            status: "active",
          }).returning();
          created.push(result[0]);
        }
      }

      return { created, count: created.length };
    }),

  // ── Get tent statistics ──
  getStats: publicQuery.query(async () => {
    const db = getDb();
    const allTents = await db.select().from(tents);

    const totalTents = allTents.length;
    const totalCapacity = allTents.reduce((sum, t) => sum + t.capacity, 0);
    const totalOccupied = allTents.reduce((sum, t) => sum + t.occupied, 0);
    const femaleTents = allTents.filter((t) => t.gender === "female").length;
    const maleTents = allTents.filter((t) => t.gender === "male").length;
    const activeTents = allTents.filter((t) => t.status === "active").length;
    const maintenanceTents = allTents.filter((t) => t.status === "maintenance").length;

    return {
      totalTents,
      totalCapacity,
      totalOccupied,
      availableBeds: totalCapacity - totalOccupied,
      occupancyRate: totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0,
      femaleTents,
      maleTents,
      activeTents,
      maintenanceTents,
      utilizationPercentage: totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0,
    };
  }),
});
