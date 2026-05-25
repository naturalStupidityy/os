import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { exams, questions, examAttempts, systemConfig } from "@db/schema";

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

  startExam: authedQuery
    .input(z.object({ examId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const exam = await db.select().from(exams).where(eq(exams.id, input.examId)).limit(1);
      if (exam.length === 0) throw new Error("Exam not found");

      const examQuestions = await db.select().from(questions).where(eq(questions.examId, input.examId));

      return {
        id: crypto.randomUUID(),
        examId: exam[0].id,
        userId: ctx.user!.id,
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
        userId: ctx.user!.id,
        userName: ctx.user!.name,
        score: correct,
        totalQuestions: total,
        percentage,
        isPassed,
        answers: input.answers as Record<string, string>,
        submittedAt: new Date(),
      }).returning();

      return {
        id: result[0].id,
        examId: input.examId,
        score: correct,
        totalQuestions: total,
        percentage,
        isPassed,
        submittedAt: new Date(),
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
