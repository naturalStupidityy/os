import { z } from 'zod';
import { router, adminProcedure, publicProcedure } from '../trpc';
import { ConfigService } from '../services/ConfigService';

export const adminRouter = router({
  // ── Configuration Management ──

  getConfig: adminProcedure.query(async () => {
    const configs = await ConfigService.getAll();
    return configs.map((c) => ({
      key: c.key,
      value: c.dbValue,
      defaultValue: c.value,
      category: c.category,
      description: c.description,
      valueType: c.valueType,
      minValue: c.minValue ?? null,
      maxValue: c.maxValue ?? null,
      editableByAdmin: c.editableByAdmin,
      requiresRestart: c.requiresRestart,
      updatedAt: c.updatedAt,
      updatedBy: c.updatedBy,
    }));
  }),

  getConfigByCategory: adminProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ input }) => {
      const configs = await ConfigService.getByCategory(input.category);
      return configs.map((c) => ({
        key: c.key,
        value: c.dbValue,
        defaultValue: c.value,
        category: c.category,
        description: c.description,
        valueType: c.valueType,
        minValue: c.minValue ?? null,
        maxValue: c.maxValue ?? null,
        editableByAdmin: c.editableByAdmin,
        requiresRestart: c.requiresRestart,
        updatedAt: c.updatedAt,
        updatedBy: c.updatedBy,
      }));
    }),

  getConfigValue: adminProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const value = await ConfigService.get(input.key);
      return { key: input.key, value };
    }),

  updateConfig: adminProcedure
    .input(
      z.object({
        key: z.string().min(1),
        value: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx as any).user?.id;
      const result = await ConfigService.update(input.key, input.value, userId);
      return { key: input.key, value: input.value, ...result };
    }),

  bulkUpdateConfig: adminProcedure
    .input(
      z.array(
        z.object({
          key: z.string().min(1),
          value: z.string().min(1),
        })
      )
    )
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx as any).user?.id;
      const results = await ConfigService.bulkUpdate(input, userId);
      return { results };
    }),

  resetConfigToDefault: adminProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx as any).user?.id;
      const result = await ConfigService.resetToDefault(input.key, userId);
      return { key: input.key, ...result };
    }),

  getConfigCategories: adminProcedure.query(() => {
    return ConfigService.getCategories();
  }),

  // ── System Stats ──

  getStats: adminProcedure.query(async () => {
    return {
      totalVolunteers: 1247,
      totalInstructors: 48,
      totalSessions: 156,
      totalCheckIns: 8934,
      avgAttendance: 87.5,
      examPassRate: 78.2,
      activeEvents: 1,
      certificatesIssued: 892,
    };
  }),

  // ── API Status ──

  getAPIStatus: adminProcedure.query(async () => {
    return [
      { name: 'PostgreSQL Database', status: 'operational', latency: '12ms', lastChecked: new Date().toISOString() },
      { name: 'Redis Cache', status: 'operational', latency: '3ms', lastChecked: new Date().toISOString() },
      { name: 'S3 Storage', status: 'operational', latency: '45ms', lastChecked: new Date().toISOString() },
      { name: 'SMS Gateway', status: 'degraded', latency: '320ms', lastChecked: new Date().toISOString() },
      { name: 'Email Service', status: 'operational', latency: '89ms', lastChecked: new Date().toISOString() },
      { name: 'Aadhaar API', status: 'operational', latency: '156ms', lastChecked: new Date().toISOString() },
    ];
  }),

  // ── Reports ──

  getReports: adminProcedure
    .input(
      z
        .object({
          type: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional()
    )
    .query(async () => {
      return [
        { id: 'rpt-001', type: 'attendance', title: 'Daily Attendance Report', generatedAt: new Date().toISOString(), status: 'ready' },
        { id: 'rpt-002', type: 'eligibility', title: 'Volunteer Eligibility Summary', generatedAt: new Date().toISOString(), status: 'ready' },
        { id: 'rpt-003', type: 'unit_wise', title: 'Unit-wise Performance Report', generatedAt: new Date().toISOString(), status: 'ready' },
        { id: 'rpt-004', type: 'certificate', title: 'Certificate Issuance Report', generatedAt: new Date().toISOString(), status: 'ready' },
      ];
    }),

  generateReport: adminProcedure
    .input(
      z.object({
        type: z.string(),
        filters: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return {
        id: 'rpt-' + Math.random().toString(36).slice(2, 8),
        type: input.type,
        status: 'generating',
        estimatedTime: '30s',
      };
    }),

  // ── User Management ──

  getUsers: publicProcedure
    .input(
      z
        .object({
          role: z.string().optional(),
          page: z.number().default(1),
          limit: z.number().default(50),
        })
        .optional()
    )
    .query(async () => {
      return {
        users: [
          { id: 'usr-001', firstName: 'Rahul', lastName: 'Sharma', fullName: 'Rahul Sharma', role: 'volunteer', mobileNumber: '9876543210', unit: 'Unit A', isVerified: true },
          { id: 'usr-002', firstName: 'Priya', lastName: 'Patel', fullName: 'Priya Patel', role: 'instructor', mobileNumber: '9876543211', unit: 'Unit B', isVerified: true },
          { id: 'usr-003', firstName: 'Amit', lastName: 'Kumar', fullName: 'Amit Kumar', role: 'admin', mobileNumber: '9876543212', unit: 'HQ', isVerified: true },
          { id: 'usr-004', firstName: 'Sneha', lastName: 'Gupta', fullName: 'Sneha Gupta', role: 'volunteer', mobileNumber: '9876543213', unit: 'Unit A', isVerified: false },
          { id: 'usr-005', firstName: 'Vikram', lastName: 'Singh', fullName: 'Vikram Singh', role: 'assessment_admin', mobileNumber: '9876543214', unit: 'HQ', isVerified: true },
        ],
        total: 5,
      };
    }),

  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return { userId: input.userId, role: input.role, updated: true };
    }),
});
