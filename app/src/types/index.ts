export type UserRole = 'volunteer' | 'instructor' | 'admin' | 'assessment_admin';

export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  unit?: string;
  designation?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface OTPRequest {
  phone: string;
  role?: UserRole;
}

export interface OTPVerify {
  phone: string;
  otp: string;
}

export interface KumbhEvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  description?: string;
  status?: string;
}

export interface Session {
  id: string;
  eventId: string;
  name: string;
  slot: string;
  date: string;
  venue: string;
  capacity: number;
  status: string;
}

export interface SessionDay {
  date: string;
  day: number;
  sessions: Session[];
  hasExam: boolean;
  examType: string;
}

export interface CheckInPayload {
  sessionId: string;
  method: 'qr' | 'manual';
  qrCode?: string;
}

export interface CheckInRecord {
  id: string;
  sessionId: string;
  eventId: string;
  status: string;
  checkInAt?: string;
}

export interface Exam {
  id: string;
  eventId: string;
  name: string;
  type: string;
  status: string;
  durationMinutes: number;
  passingScore: number;
  maxAttempts: number;
  questionCount: number;
  instructions?: string;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  isPassed: boolean;
  submittedAt: string;
}

export interface Certificate {
  id: string;
  userId: string;
  certificateNumber: string;
  status: string;
  issuedAt: string;
}

export interface SystemConfig {
  key: string;
  value: string;
  defaultValue?: string;
  category: string;
  description: string;
  valueType: string;
  minValue?: number | null;
  maxValue?: number | null;
  editableByAdmin: boolean;
  requiresRestart: boolean;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface ConfigCategory {
  id: string;
  label: string;
  description: string;
}

export interface APIStatus {
  name: string;
  status: string;
  latency: string;
}

export interface AdminReport {
  id: string;
  title: string;
  type: string;
  generatedAt?: string;
  status?: string;
}

export interface SyncQueueItem {
  id: string;
  status: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
}

export interface DashboardCard {
  title: string;
  value: string | number;
  description?: string;
  icon: string;
}
