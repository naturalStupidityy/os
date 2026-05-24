import { create } from 'zustand';
import { Exam, ExamAttempt } from '@/types';
import { examApi } from '@/lib/api';

interface ExamStore {
  // Data
  exams: Exam[];
  currentExam: Exam | null;
  currentAttempt: ExamAttempt | null;
  myAttempts: ExamAttempt[];
  
  // Timer
  timeRemaining: number; // in seconds
  isTimerRunning: boolean;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentExam: (exam: Exam | null) => void;
  
  // API Actions
  fetchExams: (sessionId?: string) => Promise<void>;
  fetchExam: (examId: string) => Promise<void>;
  startExam: (examId: string) => Promise<void>;
  submitExam: (answers: Record<string, string>) => Promise<void>;
  fetchMyAttempts: () => Promise<void>;
  
  // Timer Actions
  setTimeRemaining: (seconds: number) => void;
  startTimer: () => void;
  stopTimer: () => void;
  decrementTimer: () => void;
  
  // Answers
  answers: Record<string, string>;
  setAnswer: (questionId: string, answer: string) => void;
  clearAnswers: () => void;
}

export const useExamStore = create<ExamStore>((set, get) => ({
  // Initial state
  exams: [],
  currentExam: null,
  currentAttempt: null,
  myAttempts: [],
  timeRemaining: 0,
  isTimerRunning: false,
  isLoading: false,
  error: null,
  answers: {},

  // Setters
  setCurrentExam: (exam) => set({ currentExam: exam }),

  // Fetch exams
  fetchExams: async (sessionId) => {
    try {
      set({ isLoading: true, error: null });
      const exams = await examApi.getExams(sessionId);
      set({ exams, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch exams',
        isLoading: false,
      });
    }
  },

  // Fetch single exam
  fetchExam: async (examId) => {
    try {
      set({ isLoading: true, error: null });
      const exam = await examApi.getExam(examId);
      set({ currentExam: exam, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch exam',
        isLoading: false,
      });
    }
  },

  // Start exam
  startExam: async (examId) => {
    try {
      set({ isLoading: true, error: null });
      const attempt = await examApi.startExam(examId);
      set({
        currentAttempt: attempt,
        timeRemaining: (attempt.timeTaken ?? 0) > 0 
          ? attempt.timeTaken! 
          : (get().currentExam?.duration ?? 30) * 60,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to start exam',
        isLoading: false,
      });
    }
  },

  // Submit exam
  submitExam: async (answers) => {
    try {
      set({ isLoading: true, error: null });
      const { currentAttempt } = get();
      if (!currentAttempt) throw new Error('No active exam attempt');
      
      const result = await examApi.submitExam(currentAttempt.examId, answers);
      set({
        currentAttempt: result,
        isLoading: false,
        isTimerRunning: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to submit exam',
        isLoading: false,
      });
    }
  },

  // Fetch my attempts
  fetchMyAttempts: async () => {
    try {
      set({ isLoading: true, error: null });
      const attempts = await examApi.getMyAttempts();
      set({ myAttempts: attempts, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch attempts',
        isLoading: false,
      });
    }
  },

  // Timer actions
  setTimeRemaining: (seconds) => set({ timeRemaining: seconds }),
  
  startTimer: () => set({ isTimerRunning: true }),
  
  stopTimer: () => set({ isTimerRunning: false }),
  
  decrementTimer: () => {
    set((state) => {
      if (state.timeRemaining <= 1) {
        return { timeRemaining: 0, isTimerRunning: false };
      }
      return { timeRemaining: state.timeRemaining - 1 };
    });
  },

  // Answer actions
  setAnswer: (questionId, answer) =>
    set((state) => ({
      answers: { ...state.answers, [questionId]: answer },
    })),

  clearAnswers: () => set({ answers: {} }),
}));
