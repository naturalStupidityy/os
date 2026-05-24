import { create } from 'zustand';
import { examApi } from '@/lib/api';

interface Exam {
  id: string;
  name: string;
  type: string;
  status: string;
  durationMinutes: number;
  passingScore: number;
  questionCount: number;
  instructions?: string;
  eventId: string;
}

interface ExamAttempt {
  id: string;
  examId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  isPassed: boolean;
  submittedAt: string;
}

interface ExamState {
  exams: Exam[];
  attempts: ExamAttempt[];
  isLoading: boolean;
  fetchExams: () => Promise<void>;
  fetchAttempts: () => Promise<void>;
}

export const useExamStore = create<ExamState>((set) => ({
  exams: [],
  attempts: [],
  isLoading: false,
  fetchExams: async () => {
    set({ isLoading: true });
    try {
      const exams = await examApi.getExams();
      set({ exams, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
  fetchAttempts: async () => {
    try {
      const attempts = await examApi.getMyAttempts();
      set({ attempts });
    } catch {
      // ignore
    }
  },
}));
