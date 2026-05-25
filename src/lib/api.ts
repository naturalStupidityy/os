import type { UserRole } from "@/types";

// Token helpers
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("vkumb_token");
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("vkumb_token", token);
}

export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("vkumb_token");
}

// Auth API - using direct fetch for auth since tRPC auth is special
const API_BASE = "/api/trpc";

async function trpcFetch<T>(path: string, input?: unknown): Promise<T> {
  const token = getToken();
  const url = input
    ? `${API_BASE}/${path}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
    : `${API_BASE}/${path}`;

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.result?.data?.json as T;
}

async function trpcMutate<T>(path: string, input?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      json: input,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.result?.data?.json as T;
}

// Auth API
export const authApi = {
  requestOTP: (phone: string, role?: UserRole) =>
    trpcMutate<{ requestId: string; expiresIn: number }>("auth.requestOTP", { phone, role }),

  verifyOTP: (phone: string, otp: string, role?: UserRole) =>
    trpcMutate<{ user: any; token: string }>("auth.verifyOTP", { phone, otp, role }),

  demoLogin: (role: UserRole) =>
    trpcMutate<{ user: any; token: string }>("auth.demoLogin", { role }),

  me: () => trpcFetch<any>("auth.me"),

  logout: () => trpcMutate<void>("auth.logout"),
};

// Session API
export const sessionApi = {
  getEvents: () => trpcFetch<any[]>("events.list"),
  getDaywiseSchedule: (eventId: string) => trpcFetch<any[]>("events.getSchedule", { eventId }),
  getSessions: (eventId?: string) => trpcFetch<any[]>("events.getSessions", eventId ? { eventId } : {}),
  getSession: (sessionId: string) => trpcFetch<any>("events.getSession", { sessionId }),
  getSessionAttendance: (sessionId: string) => trpcFetch<any[]>("attendance.getSessionAttendance", { sessionId }),
};

// Attendance API
export const attendanceApi = {
  checkIn: (payload: { sessionId: string; eventId: string; qrData?: string; method?: string }) =>
    trpcMutate<any>("attendance.checkIn", payload),
  manualCheckIn: (payload: { sessionId: string; eventId: string; userId: string; userName?: string; reason?: string }) =>
    trpcMutate<any>("attendance.manualCheckIn", payload),
  getMyAttendance: () => trpcFetch<any[]>("attendance.getMyAttendance"),
  getStats: (sessionId: string) => trpcFetch<any>("attendance.getStats", { sessionId }),
};

// QR API
export const qrApi = {
  generate: (sessionId: string) =>
    trpcMutate<any>("qr.generate", { sessionId }),
  validate: (qrData: string) =>
    trpcMutate<any>("qr.validate", { qrData }),
};

// Exam API
export const examApi = {
  getExams: () => trpcFetch<any[]>("exams.list"),
  getExam: (examId: string) => trpcFetch<any>("exams.getById", { examId }),
  startExam: (examId: string) => trpcMutate<any>("exams.startExam", { examId }),
  submitExam: (examId: string, answers: Record<string, string>) =>
    trpcMutate<any>("exams.submitExam", { examId, answers }),
  getMyAttempts: () => trpcFetch<any[]>("exams.getMyAttempts"),
  getAllAttempts: () => trpcFetch<any[]>("exams.getAllAttempts"),
};

// Certificate API
export const certificateApi = {
  getMyCertificates: () => trpcFetch<any[]>("certificates.getMyCertificates"),
  downloadCertificate: (id: string) => trpcFetch<any>("certificates.download", { certificateId: id }),
};

// Admin API
export const adminApi = {
  getConfig: () => trpcFetch<any[]>("admin.getConfig"),
  updateConfig: (key: string, value: string | number | boolean) =>
    trpcMutate<any>("admin.updateConfig", { key, value: String(value) }),
  bulkUpdateConfig: (updates: Array<{ key: string; value: string }>) =>
    trpcMutate<any>("admin.bulkUpdateConfig", updates),
  resetConfig: (key: string) =>
    trpcMutate<any>("admin.resetConfigToDefault", { key }),
  getConfigCategories: () => trpcFetch<any[]>("admin.getConfigCategories"),
  getAPIStatus: () => trpcFetch<any[]>("admin.getAPIStatus"),
  getStats: () => trpcFetch<any>("admin.getStats"),
  getReports: () => trpcFetch<any[]>("admin.getReports"),
  generateReport: (reportId: string) =>
    trpcMutate<any>("admin.generateReport", { type: reportId }),
  getUsers: () => trpcFetch<any>("admin.getUsers"),
  updateUserRole: (userId: string, role: string) =>
    trpcMutate<any>("admin.updateUserRole", { userId, role }),
  updateUserStatus: (userId: string, status: string) =>
    trpcMutate<any>("admin.updateUserStatus", { userId, status }),
};

// Sync API
export const syncApi = {
  syncItems: (items: any[]) => trpcMutate<any>("sync.batchSync", { items }),
};

export default { auth: authApi, sessions: sessionApi, exam: examApi, certificate: certificateApi, admin: adminApi, sync: syncApi, attendance: attendanceApi, qr: qrApi };
