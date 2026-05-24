import { z } from 'zod';
import { router, publicProcedure, authedProcedure } from '../trpc';
import { exams, questions, examAttempts } from '../db/schema';
import { eq } from 'drizzle-orm';

const demoQuestions = [
  {
    id: 'q-001',
    question: 'What is the first step in crowd management?',
    options: { a: 'Panic and run', b: 'Assess the situation and stay calm', c: 'Push people aside', d: 'Ignore the crowd' },
    correctAnswer: 'b',
    difficulty: 'easy',
    category: 'Behavioral',
    explanation: 'Staying calm allows for rational decision-making.',
  },
  {
    id: 'q-002',
    question: 'In case of fire, which type of extinguisher should be used for electrical fires?',
    options: { a: 'Water-based', b: 'Foam', c: 'CO2 (Class C)', d: 'Wet chemical' },
    correctAnswer: 'c',
    difficulty: 'medium',
    category: 'Fire',
    explanation: 'CO2 extinguishers are safe for electrical fires.',
  },
  {
    id: 'q-003',
    question: 'What does CPR stand for?',
    options: { a: 'Cardiac Patient Recovery', b: 'Cardiopulmonary Resuscitation', c: 'Critical Patient Response', d: 'Cardiac Pulse Restoration' },
    correctAnswer: 'b',
    difficulty: 'easy',
    category: 'First Aid',
    explanation: 'CPR is Cardiopulmonary Resuscitation.',
  },
  {
    id: 'q-004',
    question: 'During an earthquake, where should you take shelter?',
    options: { a: 'Near windows', b: 'Under a sturdy table or desk', c: 'In an elevator', d: 'Near tall furniture' },
    correctAnswer: 'b',
    difficulty: 'easy',
    category: 'Disaster',
    explanation: 'Sturdy furniture protects from falling debris.',
  },
  {
    id: 'q-005',
    question: 'What is the emergency helpline number in India?',
    options: { a: '100', b: '101', c: '112', d: 'All of the above' },
    correctAnswer: 'd',
    difficulty: 'easy',
    category: 'Police',
    explanation: 'All are valid emergency numbers in India.',
  },
];

const demoExams = [
  {
    id: 'exam-001',
    sessionId: null,
    eventId: 'event-001',
    name: 'Pre-Test: Basic Training Assessment',
    type: 'pre_test' as const,
    status: 'published' as const,
    durationMinutes: 30,
    passingScore: 70,
    maxAttempts: 1,
    questionCount: 5,
    instructions: 'Answer all questions. Minimum 70% required to pass.',
  },
  {
    id: 'exam-002',
    sessionId: null,
    eventId: 'event-001',
    name: 'Post-Test: Comprehensive Assessment',
    type: 'post_test' as const,
    status: 'published' as const,
    durationMinutes: 60,
    passingScore: 75,
    maxAttempts: 2,
    questionCount: 10,
    instructions: 'Comprehensive assessment covering all training modules.',
  },
];

export const examsRouter = router({
  list: publicProcedure
    .input(z.object({ sessionId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      if (input?.sessionId) {
        return demoExams.filter((e) => e.sessionId === input.sessionId);
      }
      return demoExams;
    }),

  getById: publicProcedure
    .input(z.object({ examId: z.string() }))
    .query(async ({ input }) => {
      return demoExams.find((e) => e.id === input.examId) || demoExams[0];
    }),

  startExam: authedProcedure
    .input(z.object({ examId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx as any).user?.id || 'demo-user';

      // Return exam with questions
      const exam = demoExams.find((e) => e.id === input.examId) || demoExams[0];
      const examQuestions = demoQuestions.map((q, idx) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        orderIndex: idx,
      }));

      return {
        id: crypto.randomUUID(),
        examId: exam.id,
        userId,
        startedAt: new Date(),
        questions: examQuestions,
        durationMinutes: exam.durationMinutes,
      };
    }),

  submitExam: authedProcedure
    .input(
      z.object({
        examId: z.string(),
        answers: z.record(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      // Grade the exam
      let correct = 0;
      const total = demoQuestions.length;

      for (const q of demoQuestions) {
        if (input.answers[q.id] === q.correctAnswer) {
          correct++;
        }
      }

      const percentage = Math.round((correct / total) * 100);
      const isPassed = percentage >= 70;

      return {
        id: crypto.randomUUID(),
        examId: input.examId,
        score: correct,
        totalQuestions: total,
        percentage,
        isPassed,
        submittedAt: new Date(),
      };
    }),

  getMyAttempts: authedProcedure.query(async ({ ctx }) => {
    const userId = (ctx as any).user?.id || 'demo-user';

    return [
      {
        id: 'attempt-001',
        examId: 'exam-001',
        userId,
        startedAt: new Date('2025-01-15T10:00:00'),
        submittedAt: new Date('2025-01-15T10:25:00'),
        score: 4,
        totalQuestions: 5,
        percentage: 80,
        isPassed: true,
      },
    ];
  }),
});
