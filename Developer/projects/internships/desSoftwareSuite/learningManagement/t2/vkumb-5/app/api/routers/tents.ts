import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { createRouter, publicQuery, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { tents } from "@db/schema";

export const tentsRouter = createRouter({
  // ── List all tents ──
  list: publicQuery.query(async () => {
    try {
      const db = getDb();
      return await db.select().from(tents).orderBy(tents.tentNumber);
    } catch (err: any) {
      console.error("[Tents] Failed to list tents:", err.message);
      throw new Error("Database connection failed. Please try again later.");
    }
  }),

  // ── Get single tent ──
  getById: publicQuery
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const db = getDb();
        const result = await db.select().from(tents).where(eq(tents.id, input.id)).limit(1);
        return result[0] || null;
      } catch (err: any) {
        console.error("[Tents] Failed to get tent:", err.message);
        throw new Error("Failed to fetch tent data.");
      }
    }),

  // ── Create tent ──
  create: adminQuery
    .input(z.object({
      tentNumber: z.string().min(1).max(20),
      name: z.string().optional().or(z.literal("")),
      sector: z.enum(["male", "female", "general", "mixed"]).default("general"),
      gender: z.enum(["male", "female", "mixed"]).default("male"),
      capacity: z.number().int().min(1).max(100).default(24),
      location: z.string().optional().or(z.literal("")),
      facilities: z.array(z.string()).optional(),
      notes: z.string().optional().or(z.literal("")),
    }))
    .mutation(async ({ input }) => {
      try {
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
          location: input.location || null,
          facilities: input.facilities || [],
          notes: input.notes || null,
          status: "active",
        }).returning();

        return result[0];
      } catch (err: any) {
        console.error("[Tents] Create failed:", err.message);
        if (err.message.includes("already exists")) throw err;
        throw new Error("Failed to create tent. Please try again.");
      }
    }),

  // ── Update tent (inline editing) ──
  update: adminQuery
    .input(z.object({
      id: z.string().min(1),
      tentNumber: z.string().min(1).max(20).optional(),
      name: z.string().optional().or(z.literal("")),
      sector: z.enum(["male", "female", "general", "mixed"]).optional(),
      gender: z.enum(["male", "female", "mixed"]).optional(),
      capacity: z.number().int().min(1).max(100).optional(),
      occupied: z.number().int().min(0).optional(),
      location: z.string().optional().or(z.literal("")),
      facilities: z.array(z.string()).optional(),
      notes: z.string().optional().or(z.literal("")),
      status: z.enum(["active", "inactive", "maintenance"]).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const db = getDb();
        const { id, ...rawUpdates } = input;

        // Filter out undefined values to avoid overwriting with null
        const updates: Record<string, any> = {};
        for (const [key, value] of Object.entries(rawUpdates)) {
          if (value !== undefined) {
            updates[key] = value;
          }
        }

        // Validate the tent exists
        const current = await db.select().from(tents).where(eq(tents.id, id)).limit(1);
        if (current.length === 0) {
          throw new Error(`Tent with ID ${id} not found`);
        }

        const currentTent = current[0];

        // Ensure occupied doesn't exceed capacity
        const newOccupied = updates.occupied !== undefined ? updates.occupied : currentTent.occupied;
        const newCapacity = updates.capacity !== undefined ? updates.capacity : currentTent.capacity;

        if (newOccupied > newCapacity) {
          throw new Error(`Occupied count (${newOccupied}) cannot exceed capacity (${newCapacity})`);
        }

        // If name is empty string, keep current name
        if (updates.name === "") delete updates.name;
        if (updates.location === "") delete updates.location;
        if (updates.notes === "") delete updates.notes;

        const result = await db.update(tents)
          .set({
            ...updates,
            updatedAt: new Date(),
          })
          .where(eq(tents.id, id))
          .returning();

        return result[0];
      } catch (err: any) {
        console.error("[Tents] Update failed:", err.message);
        if (err.message.includes("Occupied count") || err.message.includes("not found")) {
          throw err;
        }
        throw new Error("Failed to update tent. Please try again.");
      }
    }),

  // ── Delete tent ──
  delete: adminQuery
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      try {
        const db = getDb();
        await db.delete(tents).where(eq(tents.id, input.id));
        return { success: true, message: "Tent deleted successfully" };
      } catch (err: any) {
        console.error("[Tents] Delete failed:", err.message);
        throw new Error("Failed to delete tent. Please try again.");
      }
    }),

  // ── Bulk create tents ──
  bulkCreate: adminQuery
    .input(z.object({
      count: z.number().int().min(1).max(100).default(15),
      capacityPerTent: z.number().int().min(1).max(100).default(24),
      femaleSectorEnd: z.number().int().min(1).max(100).default(7),
    }))
    .mutation(async ({ input }) => {
      try {
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
      } catch (err: any) {
        console.error("[Tents] Bulk create failed:", err.message);
        throw new Error("Failed to bulk create tents. Please try again.");
      }
    }),

  // ── Get tent statistics ──
  getStats: publicQuery.query(async () => {
    try {
      const db = getDb();
      const allTents = await db.select().from(tents);

      const totalTents = allTents.length;
      const totalCapacity = allTents.reduce((sum, t) => sum + (t.capacity || 0), 0);
      const totalOccupied = allTents.reduce((sum, t) => sum + (t.occupied || 0), 0);
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
    } catch (err: any) {
      console.error("[Tents] getStats failed:", err.message);
      // Return zeroed stats instead of crashing
      return {
        totalTents: 0,
        totalCapacity: 0,
        totalOccupied: 0,
        availableBeds: 0,
        occupancyRate: 0,
        femaleTents: 0,
        maleTents: 0,
        activeTents: 0,
        maintenanceTents: 0,
        utilizationPercentage: 0,
      };
    }
  }),
});
