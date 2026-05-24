import { eq } from 'drizzle-orm';
import { db } from '../db';
import { systemConfig } from '../db/schema';

// ── Default Configuration Values (FRD Compliant) ──
// All these values can be overridden via the admin configuration panel.
// The system reads from DB first, falls back to these defaults.

export interface ConfigEntry {
  key: string;
  value: string;
  category: string;
  description: string;
  valueType: 'string' | 'integer' | 'float' | 'boolean' | 'json';
  minValue?: number;
  maxValue?: number;
  editableByAdmin: boolean;
  requiresRestart: boolean;
}

export const DEFAULT_CONFIG: ConfigEntry[] = [
  // ── Attendance Rules ──
  {
    key: 'attendance.threshold_percentage',
    value: '90',
    category: 'attendance',
    description: 'Minimum attendance percentage required for exam eligibility (e.g., 90%)',
    valueType: 'integer',
    minValue: 0,
    maxValue: 100,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'attendance.min_sessions_required',
    value: '11',
    category: 'attendance',
    description: 'Minimum number of attended sessions out of total to qualify (e.g., 11 out of 12)',
    valueType: 'integer',
    minValue: 0,
    maxValue: 20,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'attendance.total_sessions',
    value: '12',
    category: 'attendance',
    description: 'Total number of attendance sessions in the training program (6 days x 2 sessions = 12)',
    valueType: 'integer',
    minValue: 1,
    maxValue: 50,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'attendance.checkin_window_minutes',
    value: '30',
    category: 'attendance',
    description: 'Time window (in minutes) around session start during which QR check-in is allowed',
    valueType: 'integer',
    minValue: 5,
    maxValue: 120,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'attendance.manual_override_enabled',
    value: 'true',
    category: 'attendance',
    description: 'Allow instructors to manually override attendance via roster',
    valueType: 'boolean',
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'attendance.manual_override_grace_minutes',
    value: '15',
    category: 'attendance',
    description: 'Grace period (in minutes) after session ends during which manual override is allowed',
    valueType: 'integer',
    minValue: 0,
    maxValue: 60,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'attendance.instructor_override_alert_threshold',
    value: '20',
    category: 'attendance',
    description: 'Alert admin if instructor manually marks more than this % of a batch',
    valueType: 'integer',
    minValue: 0,
    maxValue: 100,
    editableByAdmin: true,
    requiresRestart: false,
  },

  // ── Tent & Logistics ──
  {
    key: 'tent.total_count',
    value: '15',
    category: 'logistics',
    description: 'Total number of tents available for volunteer accommodation',
    valueType: 'integer',
    minValue: 1,
    maxValue: 100,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'tent.capacity_per_tent',
    value: '24',
    category: 'logistics',
    description: 'Maximum number of residents per tent',
    valueType: 'integer',
    minValue: 1,
    maxValue: 100,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'tent.global_capacity_cap',
    value: '300',
    category: 'logistics',
    description: 'Global maximum number of volunteers who can be allocated tent space',
    valueType: 'integer',
    minValue: 0,
    maxValue: 5000,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'tent.female_sector_start',
    value: '1',
    category: 'logistics',
    description: 'Starting tent number for female sector (inclusive)',
    valueType: 'integer',
    minValue: 1,
    maxValue: 100,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'tent.female_sector_end',
    value: '7',
    category: 'logistics',
    description: 'Ending tent number for female sector (inclusive)',
    valueType: 'integer',
    minValue: 1,
    maxValue: 100,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'tent.male_sector_start',
    value: '8',
    category: 'logistics',
    description: 'Starting tent number for male sector (inclusive)',
    valueType: 'integer',
    minValue: 1,
    maxValue: 100,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'tent.male_sector_end',
    value: '15',
    category: 'logistics',
    description: 'Ending tent number for male sector (inclusive)',
    valueType: 'integer',
    minValue: 1,
    maxValue: 100,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'tent.allocation_strategy',
    value: 'fcfs_fill_full',
    category: 'logistics',
    description: 'Tent allocation strategy: fcfs_fill_full = fill each tent completely before next',
    valueType: 'string',
    editableByAdmin: true,
    requiresRestart: false,
  },

  // ── Assessment & Exam Rules ──
  {
    key: 'exam.question_bank_size',
    value: '1000',
    category: 'assessment',
    description: 'Total number of questions in the master MCQ bank',
    valueType: 'integer',
    minValue: 100,
    maxValue: 10000,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'exam.question_count_pre_test',
    value: '15',
    category: 'assessment',
    description: 'Number of questions in the Day 1 Pre-Test (FRD: 10-15)',
    valueType: 'integer',
    minValue: 5,
    maxValue: 50,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'exam.question_count_post_test',
    value: '30',
    category: 'assessment',
    description: 'Number of questions in the Day 6 Post-Test / MCQ (FRD: 20-30)',
    valueType: 'integer',
    minValue: 10,
    maxValue: 100,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'exam.passing_score_percentage',
    value: '50',
    category: 'assessment',
    description: 'Minimum score percentage required to pass the exam (FRD: 50%)',
    valueType: 'integer',
    minValue: 0,
    maxValue: 100,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'exam.max_attempts',
    value: '2',
    category: 'assessment',
    description: 'Maximum number of attempts allowed per exam',
    valueType: 'integer',
    minValue: 1,
    maxValue: 10,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'exam.duration_minutes_pre_test',
    value: '30',
    category: 'assessment',
    description: 'Duration of Day 1 Pre-Test in minutes',
    valueType: 'integer',
    minValue: 10,
    maxValue: 120,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'exam.duration_minutes_post_test',
    value: '60',
    category: 'assessment',
    description: 'Duration of Day 6 Post-Test in minutes',
    valueType: 'integer',
    minValue: 10,
    maxValue: 180,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'exam.retake_allowed',
    value: 'true',
    category: 'assessment',
    description: 'Allow volunteers to retake failed exams',
    valueType: 'boolean',
    editableByAdmin: true,
    requiresRestart: false,
  },

  // ── Batch Settings ──
  {
    key: 'batch.training_days',
    value: '6',
    category: 'batch',
    description: 'Number of training days in a batch (FRD: fixed 6-day curriculum)',
    valueType: 'integer',
    minValue: 1,
    maxValue: 30,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'batch.sessions_per_day',
    value: '2',
    category: 'batch',
    description: 'Number of sessions per day (AM and PM)',
    valueType: 'integer',
    minValue: 1,
    maxValue: 5,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'batch.max_volunteers_per_batch',
    value: '300',
    category: 'batch',
    description: 'Maximum number of volunteers per training batch',
    valueType: 'integer',
    minValue: 10,
    maxValue: 1000,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'batch.registration_cutoff_hours',
    value: '24',
    category: 'batch',
    description: 'Hours before batch start after which registration closes',
    valueType: 'integer',
    minValue: 0,
    maxValue: 168,
    editableByAdmin: true,
    requiresRestart: false,
  },

  // ── Certificate Rules ──
  {
    key: 'certificate.auto_generate',
    value: 'true',
    category: 'certificate',
    description: 'Automatically generate certificates upon passing exam with required attendance',
    valueType: 'boolean',
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'certificate.require_both_attendance_and_exam',
    value: 'true',
    category: 'certificate',
    description: 'Require both attendance threshold AND exam completion for certificate (FRD: both required)',
    valueType: 'boolean',
    editableByAdmin: true,
    requiresRestart: false,
  },

  // ── QR Code Settings ──
  {
    key: 'qr.validity_minutes',
    value: '15',
    category: 'security',
    description: 'QR code validity duration in minutes before expiration',
    valueType: 'integer',
    minValue: 1,
    maxValue: 60,
    editableByAdmin: true,
    requiresRestart: false,
  },

  // ── Notification Settings ──
  {
    key: 'notifications.sms_enabled',
    value: 'true',
    category: 'notifications',
    description: 'Enable SMS notifications for OTP and alerts',
    valueType: 'boolean',
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'notifications.whatsapp_enabled',
    value: 'false',
    category: 'notifications',
    description: 'Enable WhatsApp notifications (requires Meta approval)',
    valueType: 'boolean',
    editableByAdmin: true,
    requiresRestart: false,
  },

  // ── Registration Settings ──
  {
    key: 'registration.enabled',
    value: 'true',
    category: 'general',
    description: 'Allow new volunteer registrations',
    valueType: 'boolean',
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'registration.max_per_day',
    value: '500',
    category: 'general',
    description: 'Maximum number of registrations allowed per day',
    valueType: 'integer',
    minValue: 1,
    maxValue: 2000,
    editableByAdmin: true,
    requiresRestart: false,
  },
  {
    key: 'registration.require_aadhaar',
    value: 'false',
    category: 'general',
    description: 'Require Aadhaar verification during registration (FRD-ISS-01: pending UIDAI approval)',
    valueType: 'boolean',
    editableByAdmin: true,
    requiresRestart: false,
  },
];

// ── Config Service ──

export class ConfigService {
  /**
   * Initialize default configuration in the database.
   * Call this on server startup to ensure all config keys exist.
   */
  static async initializeDefaults(): Promise<void> {
    for (const entry of DEFAULT_CONFIG) {
      const existing = await db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.key, entry.key))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(systemConfig).values({
          key: entry.key,
          value: entry.value,
          description: entry.description,
          updatedBy: null,
        });
        console.log(`[Config] Initialized default: ${entry.key} = ${entry.value}`);
      }
    }
    console.log(`[Config] ${DEFAULT_CONFIG.length} configuration keys ensured in database.`);
  }

  /**
   * Get a configuration value by key.
   * Returns DB value if exists, falls back to default.
   */
  static async get(key: string): Promise<string | null> {
    const rows = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, key))
      .limit(1);

    if (rows.length > 0) {
      return rows[0].value;
    }

    // Fallback to default
    const def = DEFAULT_CONFIG.find((c) => c.key === key);
    return def?.value ?? null;
  }

  /**
   * Get a configuration value as integer.
   */
  static async getInt(key: string, fallback: number = 0): Promise<number> {
    const value = await this.get(key);
    if (value === null) return fallback;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? fallback : parsed;
  }

  /**
   * Get a configuration value as float.
   */
  static async getFloat(key: string, fallback: number = 0): Promise<number> {
    const value = await this.get(key);
    if (value === null) return fallback;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }

  /**
   * Get a configuration value as boolean.
   */
  static async getBool(key: string, fallback: boolean = false): Promise<boolean> {
    const value = await this.get(key);
    if (value === null) return fallback;
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Get all configuration entries (for admin panel).
   * Merges DB values with default metadata.
   */
  static async getAll(): Promise<Array<ConfigEntry & { dbValue: string; updatedAt: string | null; updatedBy: string | null }>> {
    const dbConfigs = await db.select().from(systemConfig);

    return DEFAULT_CONFIG.map((def) => {
      const dbEntry = dbConfigs.find((c) => c.key === def.key);
      return {
        ...def,
        value: dbEntry?.value ?? def.value,
        dbValue: dbEntry?.value ?? def.value,
        description: def.description,
        updatedAt: dbEntry?.updatedAt?.toISOString() ?? null,
        updatedBy: dbEntry?.updatedBy ?? null,
      };
    });
  }

  /**
   * Get configuration grouped by category (for admin panel UI).
   */
  static async getByCategory(category: string): Promise<Array<ConfigEntry & { dbValue: string; updatedAt: string | null }>> {
    const all = await this.getAll();
    return all.filter((c) => c.category === category);
  }

  /**
   * Get all unique categories.
   */
  static getCategories(): Array<{ id: string; label: string; description: string }> {
    return [
      { id: 'attendance', label: 'Attendance Rules', description: 'Thresholds, windows, override policies' },
      { id: 'logistics', label: 'Tent & Logistics', description: 'Tent count, capacity, gender sectors' },
      { id: 'assessment', label: 'Assessment Rules', description: 'Exam parameters, passing criteria, retries' },
      { id: 'batch', label: 'Batch Settings', description: 'Duration, session times, capacity' },
      { id: 'certificate', label: 'Certificate Rules', description: 'Issuance criteria and auto-generation' },
      { id: 'security', label: 'Security Settings', description: 'QR expiry, JWT, encryption' },
      { id: 'notifications', label: 'Notifications', description: 'SMS, WhatsApp, email settings' },
      { id: 'general', label: 'General', description: 'Registration and system-wide settings' },
    ];
  }

  /**
   * Update a configuration value.
   * Validates against constraints before saving.
   */
  static async update(key: string, value: string, updatedBy?: string): Promise<{ success: boolean; message: string }> {
    const def = DEFAULT_CONFIG.find((c) => c.key === key);
    if (!def) {
      return { success: false, message: `Unknown configuration key: ${key}` };
    }

    if (!def.editableByAdmin) {
      return { success: false, message: `Configuration key ${key} is read-only` };
    }

    // Type validation
    if (def.valueType === 'integer') {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) {
        return { success: false, message: `Value must be an integer` };
      }
      if (def.minValue !== undefined && parsed < def.minValue) {
        return { success: false, message: `Value must be at least ${def.minValue}` };
      }
      if (def.maxValue !== undefined && parsed > def.maxValue) {
        return { success: false, message: `Value must be at most ${def.maxValue}` };
      }
    }

    if (def.valueType === 'float') {
      const parsed = parseFloat(value);
      if (isNaN(parsed)) {
        return { success: false, message: `Value must be a number` };
      }
      if (def.minValue !== undefined && parsed < def.minValue) {
        return { success: false, message: `Value must be at least ${def.minValue}` };
      }
      if (def.maxValue !== undefined && parsed > def.maxValue) {
        return { success: false, message: `Value must be at most ${def.maxValue}` };
      }
    }

    if (def.valueType === 'boolean') {
      if (value !== 'true' && value !== 'false') {
        return { success: false, message: `Value must be 'true' or 'false'` };
      }
    }

    // Upsert: update if exists, insert if not
    const existing = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, key))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(systemConfig)
        .set({
          value,
          updatedBy: updatedBy || existing[0].updatedBy,
          updatedAt: new Date(),
        })
        .where(eq(systemConfig.key, key));
    } else {
      await db.insert(systemConfig).values({
        key,
        value,
        description: def.description,
        updatedBy: updatedBy || null,
      });
    }

    console.log(`[Config] Updated: ${key} = ${value} (by ${updatedBy || 'system'})`);
    return { success: true, message: 'Configuration updated successfully' };
  }

  /**
   * Bulk update multiple configuration values.
   */
  static async bulkUpdate(
    updates: Array<{ key: string; value: string }>,
    updatedBy?: string
  ): Promise<Array<{ key: string; success: boolean; message: string }>> {
    const results = [];
    for (const { key, value } of updates) {
      const result = await this.update(key, value, updatedBy);
      results.push({ key, ...result });
    }
    return results;
  }

  /**
   * Reset a configuration to its default value.
   */
  static async resetToDefault(key: string, updatedBy?: string): Promise<{ success: boolean; message: string }> {
    const def = DEFAULT_CONFIG.find((c) => c.key === key);
    if (!def) {
      return { success: false, message: `Unknown configuration key: ${key}` };
    }
    return this.update(key, def.value, updatedBy);
  }
}
