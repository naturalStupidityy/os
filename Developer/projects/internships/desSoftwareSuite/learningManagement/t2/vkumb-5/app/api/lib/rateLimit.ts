// In-memory rate limiter for demo/prototype
// For production, use Redis-backed rate limiting

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number;    // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix?: string;  // Prefix for the key
}

export function rateLimit(config: RateLimitConfig) {
  return {
    check: (identifier: string): { allowed: boolean; remaining: number; resetAt: number } => {
      const key = `${config.keyPrefix || 'rl'}:${identifier}`;
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || entry.resetAt < now) {
        // New window
        const resetAt = now + config.windowMs;
        store.set(key, { count: 1, resetAt });
        return { allowed: true, remaining: config.maxRequests - 1, resetAt };
      }

      if (entry.count >= config.maxRequests) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt };
      }

      entry.count++;
      return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
    },
  };
}

// Pre-configured rate limiters
export const rateLimiters = {
  // Auth: 5 OTP requests per 10 minutes per phone
  otpRequest: rateLimit({ windowMs: 10 * 60 * 1000, maxRequests: 5, keyPrefix: 'otp_req' }),

  // OTP verify: 10 attempts per 10 minutes per phone
  otpVerify: rateLimit({ windowMs: 10 * 60 * 1000, maxRequests: 10, keyPrefix: 'otp_verify' }),

  // QR generation: 20 per minute per instructor
  qrGenerate: rateLimit({ windowMs: 60 * 1000, maxRequests: 20, keyPrefix: 'qr_gen' }),

  // Attendance marking: 10 per minute per user
  attendance: rateLimit({ windowMs: 60 * 1000, maxRequests: 10, keyPrefix: 'attendance' }),

  // Exam submission: 3 per hour per user
  examSubmit: rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 3, keyPrefix: 'exam_submit' }),

  // Registration: 5 per hour per IP
  registration: rateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 5, keyPrefix: 'register' }),

  // General API: 100 per minute per IP
  general: rateLimit({ windowMs: 60 * 1000, maxRequests: 100, keyPrefix: 'api' }),
};

// Get client identifier from request
export function getClientIdentifier(req: Request): string {
  // Use X-Forwarded-For if behind proxy, otherwise use direct connection info
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  // Fallback: use a combination of user-agent and IP
  const ua = req.headers.get('user-agent') || 'unknown';
  return `ua:${ua.slice(0, 50)}`;
}
