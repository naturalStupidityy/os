// Minimal schema for type compatibility
export const systemConfig = {
  $inferSelect: {} as any,
  key: 'key' as any,
  value: 'value' as any,
  description: 'description' as any,
  updatedBy: 'updated_by' as any,
  updatedAt: 'updated_at' as any,
};

export const users = { $inferSelect: {} as any };
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
