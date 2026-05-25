import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { exams, questions, examAttempts, systemConfig } from "@db/schema";
import {
  checkExamEligibility,
  autoIssueCertificate,
  getUserExamStatus,
} from "../lib/businessLogic";
import { rateLimiters } from "../lib/rateLimit";

export const examsRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    const allExams = await db.select().from(exams);
    const configRows = await db.select().from(systemConfig)
      .where(eq(systemConfig.key, "exam.passing_score_percentage")).limit(1);
    const passingScore = configRows[0] ? parseInt(configRows[0].value) : 50;

    return allExams.map(exam => ({
      ...exam,
      passingScore: exam.passingScore || passingScore,
    }));
  }),

  getById: publicQuery
    .input(z.object({ examId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(exams).where(eq(exams.id, input.examId)).limit(1);
      return result[0] || null;
    }),

  // ── Get exam with questions preview (for pre-test viewing) ──
  getPreview: publicQuery
    .input(z.object({ examId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const examResult = await db.select().from(exams).where(eq(exams.id, input.examId)).limit(1);
      if (examResult.length === 0) throw new Error("Exam not found");

      const examQuestions = await db.select().from(questions).where(eq(questions.examId, input.examId));

      return {
        exam: examResult[0],
        questions: examQuestions.map((q, idx) => ({
          id: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          category: q.category,
          orderIndex: idx,
        })),
      };
    }),

  // ── Check eligibility before starting exam ──
  checkEligibility: authedQuery
    .input(z.object({ examId: z.string() }))
    .query(async ({ input, ctx }) => {
      return checkExamEligibility(ctx.user!.id, input.examId);
    }),

  // ── Get user's exam status ──
  getMyStatus: authedQuery.query(async ({ ctx }) => {
    return getUserExamStatus(ctx.user!.id);
  }),

  startExam: authedQuery
    .input(z.object({ examId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user!.id;

      // ── Check eligibility ──
      const eligibility = await checkExamEligibility(userId, input.examId);
      if (!eligibility.eligible) {
        throw new Error(eligibility.reason);
      }

      const exam = await db.select().from(exams).where(eq(exams.id, input.examId)).limit(1);
      if (exam.length === 0) throw new Error("Exam not found");

      // ── Check max attempts ──
      const attempts = await db.select().from(examAttempts)
        .where(
          and(
            eq(examAttempts.examId, input.examId),
            eq(examAttempts.userId, userId)
          )
        );

      const maxAttempts = exam[0].maxAttempts || 2;
      if (attempts.length >= maxAttempts) {
        // Check if already passed - if so, no more attempts
        const hasPassed = attempts.some((a: any) => a.isPassed);
        if (hasPassed) {
          throw new Error("You have already passed this exam. No more attempts needed.");
        }
        throw new Error(`Maximum attempts (${maxAttempts}) reached for this exam.`);
      }

      const examQuestions = await db.select().from(questions).where(eq(questions.examId, input.examId));

      return {
        id: crypto.randomUUID(),
        examId: exam[0].id,
        userId,
        startedAt: new Date(),
        durationMinutes: exam[0].durationMinutes,
        questions: examQuestions.map((q, idx) => ({
          id: q.id,
          question: q.question,
          options: q.options,
          orderIndex: idx,
        })),
      };
    }),

  submitExam: authedQuery
    .input(z.object({
      examId: z.string(),
      answers: z.record(z.string(), z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user!.id;

      // ── Rate Limit Check ──
      const rateCheck = rateLimiters.examSubmit.check(userId);
      if (!rateCheck.allowed) {
        const minutesLeft = Math.ceil((rateCheck.resetAt - Date.now()) / 60000);
        throw new Error(`Too many exam submissions. Please try again in ${minutesLeft} minute(s).`);
      }

      const examQuestions = await db.select().from(questions).where(eq(questions.examId, input.examId));

      let correct = 0;
      for (const q of examQuestions) {
        if (input.answers[q.id] === q.correctAnswer) {
          correct++;
        }
      }

      const total = examQuestions.length;
      const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

      const configRows = await db.select().from(systemConfig)
        .where(eq(systemConfig.key, "exam.passing_score_percentage")).limit(1);
      const passingScore = configRows[0] ? parseInt(configRows[0].value) : 50;
      const isPassed = percentage >= passingScore;

      const result = await db.insert(examAttempts).values({
        examId: input.examId,
        userId,
        userName: ctx.user!.name,
        score: correct,
        totalQuestions: total,
        percentage,
        isPassed,
        answers: input.answers as Record<string, string>,
        submittedAt: new Date(),
      }).returning();

      // ── Auto-issue certificate if eligible ──
      let certificateResult = null;
      if (isPassed) {
        // Get event ID from exam
        const examData = await db.select().from(exams).where(eq(exams.id, input.examId)).limit(1);
        if (examData.length > 0 && examData[0].eventId) {
          certificateResult = await autoIssueCertificate(userId, examData[0].eventId);
        }
      }

      return {
        id: result[0].id,
        examId: input.examId,
        score: correct,
        totalQuestions: total,
        percentage,
        isPassed,
        submittedAt: new Date(),
        certificateIssued: certificateResult?.issued ?? false,
        certificateMessage: certificateResult?.message ?? null,
      };
    }),

  getMyAttempts: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(examAttempts).where(eq(examAttempts.userId, ctx.user!.id));
  }),

  getAllAttempts: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(examAttempts);
  }),
});
