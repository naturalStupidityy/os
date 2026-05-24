import type { UserRole } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Token helpers
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vkumb_token');
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('vkumb_token', token);
}

export function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('vkumb_token');
}

// Fetch helper
async function request<T>(method: string, endpoint: string, body?: any): Promise<T> {
  const token = getToken();
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || `HTTP ${res.status}`);
  }
  return data as T;
}

// Auth API
export const authApi = {
  requestOTP: (phone: string, role?: UserRole) => request<{ requestId: string; expiresIn: number }>('POST', '/auth/otp/request', { phone, role }),
  verifyOTP: (phone: string, otp: string, role?: UserRole) => request<{ user: any; token: string }>('POST', '/auth/otp/verify', { phone, otp, role }),
  demoLogin: (role: UserRole) => request<{ user: any; token: string }>('POST', '/auth/otp/verify', { phone: '9876543210', otp: '123456', role }),
  me: () => request<any>('GET', '/auth/me'),
  logout: () => request<void>('POST', '/auth/logout', {}),
};

// Session API
export const sessionApi = {
  getEvents: () => request<any[]>('GET', '/events'),
  getDaywiseSchedule: (eventId: string) => request<any[]>(`GET`, `/events/${eventId}/schedule`),
  getSessions: () => request<any[]>('GET', '/sessions'),
  getSession: (sessionId: string) => request<any>(`GET`, `/sessions/${sessionId}`),
  getSessionAttendance: (sessionId: string) => request<any[]>(`GET`, `/sessions/${sessionId}/attendance`),
};

// Attendance API
export const attendanceApi = {
  checkIn: (payload: { sessionId: string; eventId: string; qrData?: string; method?: string }) =>
    request<any>('POST', '/attendance/check-in', payload),
  getMyAttendance: () => request<any[]>('GET', '/attendance/my'),
  getStats: (sessionId: string) => request<any>(`GET`, `/attendance/stats/${sessionId}`),
};

// QR API
export const qrApi = {
  generate: (sessionId: string, instructorId?: string) =>
    request<any>('POST', `/qr/generate/${sessionId}`, { instructorId }),
  validate: (qrData: string) =>
    request<any>('POST', '/qr/validate', { qrData }),
};

// Exam API
export const examApi = {
  getExams: () => request<any[]>('GET', '/exams'),
  getExam: (examId: string) => request<any>('GET', `/exams/${examId}`),
  startExam: (examId: string) => request<any>('POST', `/exams/${examId}/start`, {}),
  submitExam: (examId: string, answers: Record<string, string>) => request<any>('POST', `/exams/${examId}/submit`, { answers }),
  getMyAttempts: () => request<any[]>('GET', '/exams/attempts/my'),
  getAllAttempts: () => request<any[]>('GET', '/exams/attempts/all'),
};

// Certificate API
export const certificateApi = {
  getMyCertificates: () => request<any[]>('GET', '/certificates/my'),
  downloadCertificate: (id: string) => request<any>('GET', `/certificates/${id}/download`),
};

// Admin API
export const adminApi = {
  getConfig: () => request<any[]>('GET', '/admin/config'),
  updateConfig: (key: string, value: string | number | boolean) => request<any>('PATCH', '/admin/configurations', { key, value }),
  bulkUpdateConfig: (updates: Array<{ key: string; value: string }>) => request<any>('PATCH', '/admin/configurations/bulk', { updates }),
  resetConfig: (key: string) => request<any>('POST', `/admin/config/reset/${key}`, {}),
  getConfigCategories: () => request<any[]>('GET', '/admin/config/categories'),
  getAPIStatus: () => request<any[]>('GET', '/admin/api-status'),
  getStats: () => request<any>('GET', '/admin/stats'),
  getReports: () => request<any[]>('GET', '/admin/reports'),
  generateReport: (reportId: string) => request<any>('POST', `/admin/reports/${reportId}/generate`, {}),
  getUsers: () => request<any>('GET', '/admin/users'),
  updateUserRole: (userId: string, role: string) => request<any>('PATCH', `/admin/users/${userId}/role`, { role }),
  updateUserStatus: (userId: string, status: string) => request<any>('PATCH', `/admin/users/${userId}/status`, { status }),
  getTentConfig: () => request<Record<string, string>>('GET', '/admin/tent-config'),
};

// Sync API
export const syncApi = {
  syncItems: (items: any[]) => request<any>('POST', '/sync/batch', { items }),
};

export default { auth: authApi, sessions: sessionApi, exam: examApi, certificate: certificateApi, admin: adminApi, sync: syncApi, attendance: attendanceApi, qr: qrApi };
