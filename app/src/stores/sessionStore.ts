import { create } from 'zustand';
import { sessionApi } from '@/lib/api';

interface Session {
  id: string;
  eventId: string;
  name: string;
  slot: string;
  date: string;
  venue: string;
  capacity: number;
  status: string;
}

interface SessionDay {
  date: string;
  day: number;
  sessions: Session[];
  hasExam: boolean;
  examType: string;
}

interface SessionState {
  schedule: SessionDay[];
  isLoading: boolean;
  fetchSchedule: (eventId: string) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  schedule: [],
  isLoading: false,
  fetchSchedule: async (eventId: string) => {
    set({ isLoading: true });
    try {
      const schedule = await sessionApi.getDaywiseSchedule(eventId);
      set({ schedule, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
