// In-memory database for development/demo purposes
// In production, replace with actual PostgreSQL connection

import { ConfigEntry } from '../services/ConfigService';

interface DBRecord {
  key: string;
  value: string;
  description?: string;
  updatedBy?: string | null;
  updatedAt?: Date;
}

// In-memory store
const configStore: Map<string, DBRecord> = new Map();

// Simulated drizzle db interface
export const db = {
  select: () => ({
    from: (_table: any) => ({
      where: (_condition: any) => ({
        limit: (n: number) => {
          const results: DBRecord[] = [];
          for (const [, record] of configStore) {
            if (results.length < n) results.push(record);
          }
          return Promise.resolve(results);
        },
      }),
      // No where clause - return all
      then: (cb: (val: DBRecord[]) => any) => {
        const results = Array.from(configStore.values());
        return Promise.resolve(cb(results));
      },
    }),
  }),
  insert: (_table: any) => ({
    values: (data: any) => {
      const record: DBRecord = {
        key: data.key || data.config_key,
        value: data.value || data.config_value,
        description: data.description,
        updatedBy: data.updatedBy || null,
        updatedAt: new Date(),
      };
      configStore.set(record.key, record);
      return { returning: () => Promise.resolve([record]) };
    },
  }),
  update: (_table: any) => ({
    set: (data: any) => ({
      where: (_condition: any) => {
        // Find by key condition
        const keyMatch = _condition?.toString().match(/key\s*=\s*['"]([^'"]+)['"]/);
        if (keyMatch) {
          const key = keyMatch[1];
          const existing = configStore.get(key);
          if (existing) {
            configStore.set(key, { ...existing, ...data, updatedAt: new Date() });
          }
        }
        return Promise.resolve();
      },
    }),
  }),
  delete: (_table: any) => ({
    where: (_condition: any) => Promise.resolve(),
  }),
};

// Mock schema objects for compatibility
export const systemConfig = {
  $inferSelect: {} as any,
  $inferInsert: {} as any,
  key: { $type: 'varchar' } as any,
  value: { $type: 'text' } as any,
  description: { $type: 'text' } as any,
  updatedBy: { $type: 'varchar' } as any,
  updatedAt: { $type: 'timestamp' } as any,
};

export const users = {
  $inferSelect: {} as any,
  $inferInsert: {} as any,
};

export const kumbhEvents = { $inferSelect: {} as any };
export const sessions = { $inferSelect: {} as any };
export const checkIns = { $inferSelect: {} as any };
export const exams = { $inferSelect: {} as any };
export const questions = { $inferSelect: {} as any };
export const attempts = { $inferSelect: {} as any };
export const certificates = { $inferSelect: {} as any };
export const syncQueue = { $inferSelect: {} as any };
export const qrCodes = { $inferSelect: {} as any };

export const eq = (a: any, b: any) => ({ _eq: true, a, b });
