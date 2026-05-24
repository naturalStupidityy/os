import { create } from 'zustand';
import { KumbhEvent, Session, SessionDay, AttendanceStats } from '@/types';
import { sessionApi, attendanceApi } from '@/lib/api';

interface SessionStore {
  // Data
  events: KumbhEvent[];
  currentEvent: KumbhEvent | null;
  sessions: Session[];
  schedule: SessionDay[];
  currentSession: Session | null;
  attendanceStats: Record<string, AttendanceStats>;
  
  // UI State
  selectedDate: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentEvent: (event: KumbhEvent | null) => void;
  setSelectedDate: (date: string | null) => void;
  setCurrentSession: (session: Session | null) => void;
  
  // API Actions
  fetchEvents: () => Promise<void>;
  fetchSchedule: (eventId: string) => Promise<void>;
  fetchSessions: (eventId: string, date?: string) => Promise<void>;
  fetchSession: (sessionId: string) => Promise<void>;
  fetchAttendanceStats: (sessionId: string) => Promise<void>;
  
  // Getters
  getTodaySessions: () => Session[];
  getSessionById: (id: string) => Session | undefined;
  getUpcomingSessions: () => Session[];
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  // Initial state
  events: [],
  currentEvent: null,
  sessions: [],
  schedule: [],
  currentSession: null,
  attendanceStats: {},
  selectedDate: null,
  isLoading: false,
  error: null,

  // Setters
  setCurrentEvent: (event) => set({ currentEvent: event }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setCurrentSession: (session) => set({ currentSession: session }),

  // Fetch events list
  fetchEvents: async () => {
    try {
      set({ isLoading: true, error: null });
      const events = await sessionApi.getEvents();
      set({ events, isLoading: false });
      
      // Auto-select first active event
      const activeEvent = events.find((e) => e.isActive);
      if (activeEvent) {
        set({ currentEvent: activeEvent });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch events',
        isLoading: false,
      });
    }
  },

  // Fetch daywise schedule
  fetchSchedule: async (eventId) => {
    try {
      set({ isLoading: true, error: null });
      const schedule = await sessionApi.getDaywiseSchedule(eventId);
      set({ schedule, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch schedule',
        isLoading: false,
      });
    }
  },

  // Fetch sessions
  fetchSessions: async (eventId, date) => {
    try {
      set({ isLoading: true, error: null });
      const sessions = await sessionApi.getSessions(eventId, date ? { date } : undefined);
      set({ sessions, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch sessions',
        isLoading: false,
      });
    }
  },

  // Fetch single session
  fetchSession: async (sessionId) => {
    try {
      set({ isLoading: true, error: null });
      const session = await sessionApi.getSession(sessionId);
      set({ currentSession: session, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch session',
        isLoading: false,
      });
    }
  },

  // Fetch attendance stats
  fetchAttendanceStats: async (sessionId) => {
    try {
      const stats = await attendanceApi.getAttendanceStats(sessionId);
      set((state) => ({
        attendanceStats: { ...state.attendanceStats, [sessionId]: stats },
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch attendance stats',
      });
    }
  },

  // Get today's sessions from schedule
  getTodaySessions: () => {
    const { schedule } = get();
    const todayDay = schedule.find((d) => d.isToday);
    return todayDay?.sessions ?? [];
  },

  // Get session by ID
  getSessionById: (id) => {
    const { sessions } = get();
    return sessions.find((s) => s.id === id);
  },

  // Get upcoming sessions
  getUpcomingSessions: () => {
    const { sessions } = get();
    const now = new Date();
    return sessions.filter((s) => {
      const sessionDate = new Date(`${s.date}T${s.startTime}`);
      return sessionDate > now && s.status === 'upcoming';
    });
  },
}));
