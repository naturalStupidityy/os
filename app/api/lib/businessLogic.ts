// Business Logic Enforcement Service
// Centralizes all business rules for the VKumbh system

import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../queries/connection";
import {
  users,
  attendanceRecords,
  exams,
  examAttempts,
  sessions,
  certificates,
  kumbhEvents,
  systemConfig,
} from "@db/schema";

export interface EligibilityResult {
  eligible: boolean;
  reason: string;
  details: {
    attendanceCount: number;
    totalSessions: number;
    attendancePercentage: number;
    requiredPercentage: number;
    minSessionsRequired: number;
    preTestCompleted: boolean;
    preTestPassed: boolean;
  };
}

export interface CertificateEligibility {
  eligible: boolean;
  reason: string;
  details: {
    attendanceMet: boolean;
    examPassed: boolean;
    preTestCompleted: boolean;
    postTestCompleted: boolean;
  };
}

// ── Get Config Value ──
async function getConfigValue(key: string, defaultValue: string): Promise<string> {
  try {
    const db = getDb();
    const result = await db.select().from(systemConfig).where(eq(systemConfig.key, key)).limit(1);
    return result[0]?.value ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

// ── Get Attendance Stats for a User ──
export async function getAttendanceStats(userId: string): Promise<{
  totalSessions: number;
  attendedSessions: number;
  attendancePercentage: number;
}> {
  const db = getDb();

  // Count sessions that have at least one attendance record (meaning they've started)
  const sessionAttendanceCounts = await db
    .select({
      sessionId: attendanceRecords.sessionId,
      count: sql<number>`count(*)`,
    })
    .from(attendanceRecords)
    .groupBy(attendanceRecords.sessionId);

  const completedSessionIds = new Set(sessionAttendanceCounts.map((s) => s.sessionId));
  const totalSessions = completedSessionIds.size;

  // Get user's attendance records
  const userAttendance = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.userId, userId),
        eq(attendanceRecords.status, "present")
      )
    );

  const attendedSessions = userAttendance.length;
  const attendancePercentage = totalSessions > 0
    ? Math.round((attendedSessions / totalSessions) * 100)
    : 0;

  return { totalSessions, attendedSessions, attendancePercentage };
}

// ── Check Exam Eligibility ──
export async function checkExamEligibility(
  userId: string,
  examId: string
): Promise<EligibilityResult> {
  const db = getDb();

  // Get config values
  const requiredPercentage = parseInt(
    await getConfigValue("attendance.threshold_percentage", "90"),
    10
  );
  const minSessionsRequired = parseInt(
    await getConfigValue("attendance.min_sessions_required", "11"),
    10
  );

  // Get attendance stats
  const { totalSessions, attendedSessions, attendancePercentage } =
    await getAttendanceStats(userId);

  // Get exam details
  const examRows = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
  const exam = examRows[0];

  // Check pre-test requirement for post-test
  let preTestCompleted = false;
  let preTestPassed = false;

  if (exam?.type === "post_test") {
    const preTestExam = await db
      .select()
      .from(exams)
      .where(eq(exams.type, "pre_test"))
      .limit(1);

    if (preTestExam.length > 0) {
      const preTestAttempt = await db
        .select()
        .from(examAttempts)
        .where(
          and(
            eq(examAttempts.userId, userId),
            eq(examAttempts.examId, preTestExam[0].id)
          )
        )
        .limit(1);

      preTestCompleted = preTestAttempt.length > 0;
      preTestPassed = preTestAttempt[0]?.isPassed ?? false;
    }
  } else {
    // For pre-test, mark as satisfied
    preTestCompleted = true;
    preTestPassed = true;
  }

  // Determine eligibility
  const attendanceMet = attendancePercentage >= requiredPercentage;
  const sessionsMet = attendedSessions >= minSessionsRequired;
  const preTestMet = exam?.type === "pre_test" ? true : preTestCompleted;

  const eligible = attendanceMet && sessionsMet && preTestMet;

  let reason = "";
  if (!eligible) {
    if (!attendanceMet) {
      reason = `Attendance requirement not met. You have ${attendancePercentage}% attendance (${attendedSessions}/${totalSessions} sessions). Required: ${requiredPercentage}%.`;
    } else if (!sessionsMet) {
      reason = `Minimum sessions requirement not met. You attended ${attendedSessions} sessions. Required: ${minSessionsRequired}.`;
    } else if (!preTestMet) {
      reason = `Pre-test requirement not met. You must complete and pass the Pre-Test before taking the Post-Test.`;
    }
  } else {
    reason = `You are eligible to take this exam. Attendance: ${attendancePercentage}% (${attendedSessions}/${totalSessions} sessions).`;
    if (exam?.type === "post_test") {
      reason += ` Pre-test passed: ${preTestPassed ? "Yes" : "No (but completed)"}.`;
    }
  }

  return {
    eligible,
    reason,
    details: {
      attendanceCount: attendedSessions,
      totalSessions,
      attendancePercentage,
      requiredPercentage,
      minSessionsRequired,
      preTestCompleted,
      preTestPassed,
    },
  };
}

// ── Check Certificate Eligibility ──
export async function checkCertificateEligibility(
  userId: string
): Promise<CertificateEligibility> {
  const db = getDb();

  // Check attendance requirement
  const { attendedSessions, attendancePercentage } = await getAttendanceStats(userId);
  const requiredPercentage = parseInt(
    await getConfigValue("attendance.threshold_percentage", "90"),
    10
  );
  const minSessionsRequired = parseInt(
    await getConfigValue("attendance.min_sessions_required", "11"),
    10
  );
  const attendanceMet =
    attendancePercentage >= requiredPercentage && attendedSessions >= minSessionsRequired;

  // Check if user has passed both pre-test and post-test
  const allExams = await db.select().from(exams);
  let preTestCompleted = false;
  let postTestCompleted = false;
  let examPassed = false;

  for (const exam of allExams) {
    const attempts = await db
      .select()
      .from(examAttempts)
      .where(
        and(eq(examAttempts.userId, userId), eq(examAttempts.examId, exam.id))
      )
      .orderBy(sql`${examAttempts.submittedAt} desc`)
      .limit(1);

    if (attempts.length > 0 && attempts[0].isPassed) {
      if (exam.type === "pre_test") preTestCompleted = true;
      if (exam.type === "post_test") postTestCompleted = true;
    }
  }

  // Certificate requires both attendance AND passing post-test
  // Pre-test completion is tracked but not strictly required for certificate
  examPassed = postTestCompleted;

  const eligible = attendanceMet && examPassed;

  let reason = "";
  if (!eligible) {
    if (!attendanceMet) {
      reason = `Certificate not yet eligible. Attendance: ${attendancePercentage}% (${attendedSessions} sessions). Required: ${requiredPercentage}%.`;
    } else if (!examPassed) {
      reason = `Certificate not yet eligible. You must pass the Post-Test exam.`;
    }
  } else {
    reason = `Congratulations! You are eligible for a certificate. All requirements met.`;
  }

  return {
    eligible,
    reason,
    details: {
      attendanceMet,
      examPassed,
      preTestCompleted,
      postTestCompleted,
    },
  };
}

// ── Auto-issue Certificate ──
export async function autoIssueCertificate(userId: string, eventId: string): Promise<{
  issued: boolean;
  certificateId?: string;
  message: string;
}> {
  const db = getDb();

  // Check eligibility
  const eligibility = await checkCertificateEligibility(userId);
  if (!eligibility.eligible) {
    return { issued: false, message: eligibility.reason };
  }

  // Check if certificate already issued
  const existing = await db
    .select()
    .from(certificates)
    .where(
      and(eq(certificates.userId, userId), eq(certificates.eventId, eventId))
    )
    .limit(1);

  if (existing.length > 0 && existing[0].status === "issued") {
    return { issued: false, message: "Certificate already issued.", certificateId: existing[0].id };
  }

  // Get user details
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0];

  // Get event details
  const eventRows = await db
    .select()
    .from(kumbhEvents)
    .where(eq(kumbhEvents.id, eventId))
    .limit(1);
  const event = eventRows[0];

  // Get best exam score
  const attempts = await db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.userId, userId))
    .orderBy(sql`${examAttempts.percentage} desc`)
    .limit(1);

  const bestAttempt = attempts[0];

  // Generate certificate number
  const certNumber = `VK-2025-CERT-${String(Math.floor(Math.random() * 90000) + 10000)}`;

  // Grade calculation
  const percentage = bestAttempt?.percentage ?? 0;
  let grade = "C";
  if (percentage >= 90) grade = "A+";
  else if (percentage >= 80) grade = "A";
  else if (percentage >= 70) grade = "B+";
  else if (percentage >= 60) grade = "B";
  else if (percentage >= 50) grade = "C";

  // Insert certificate
  const result = await db
    .insert(certificates)
    .values({
      userId,
      certificateNumber: certNumber,
      eventId,
      eventName: event?.name ?? "VKumbh 2025 Training",
      volunteerName: user?.fullName ?? "Volunteer",
      issueDate: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year validity
      status: "issued",
      type: "Completion",
      grade,
      score: percentage,
      issuedAt: new Date(),
    })
    .returning();

  return {
    issued: true,
    certificateId: result[0].id,
    message: `Certificate issued successfully! Grade: ${grade}`,
  };
}

// ── Check if all sessions completed (trigger for exam opening) ──
export async function checkAllSessionsCompleted(eventId: string): Promise<boolean> {
  const db = getDb();

  const allSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.eventId, eventId));

  // All sessions must be completed
  return allSessions.length > 0 && allSessions.every((s) => s.status === "completed");
}

// ── Get Exam Status for a User ──
export async function getUserExamStatus(userId: string): Promise<{
  preTestTaken: boolean;
  preTestPassed: boolean;
  postTestTaken: boolean;
  postTestPassed: boolean;
  canTakePreTest: boolean;
  canTakePostTest: boolean;
  attendancePercentage: number;
  sessionsAttended: number;
  totalSessions: number;
}> {
  const db = getDb();

  const { totalSessions, attendedSessions, attendancePercentage } =
    await getAttendanceStats(userId);

  const requiredPercentage = parseInt(
    await getConfigValue("attendance.threshold_percentage", "90"),
    10
  );

  // Check pre-test
  const preTestExam = await db
    .select()
    .from(exams)
    .where(eq(exams.type, "pre_test"))
    .limit(1);

  let preTestTaken = false;
  let preTestPassed = false;

  if (preTestExam.length > 0) {
    const preAttempt = await db
      .select()
      .from(examAttempts)
      .where(
        and(eq(examAttempts.userId, userId), eq(examAttempts.examId, preTestExam[0].id))
      )
      .limit(1);

    preTestTaken = preAttempt.length > 0;
    preTestPassed = preAttempt[0]?.isPassed ?? false;
  }

  // Check post-test
  const postTestExam = await db
    .select()
    .from(exams)
    .where(eq(exams.type, "post_test"))
    .limit(1);

  let postTestTaken = false;
  let postTestPassed = false;

  if (postTestExam.length > 0) {
    const postAttempt = await db
      .select()
      .from(examAttempts)
      .where(
        and(eq(examAttempts.userId, userId), eq(examAttempts.examId, postTestExam[0].id))
      )
      .limit(1);

    postTestTaken = postAttempt.length > 0;
    postTestPassed = postAttempt[0]?.isPassed ?? false;
  }

  // Can take pre-test if attendance threshold met
  const canTakePreTest = attendancePercentage >= requiredPercentage;

  // Can take post-test if pre-test completed AND attendance met
  const canTakePostTest = preTestTaken && canTakePreTest;

  return {
    preTestTaken,
    preTestPassed,
    postTestTaken,
    postTestPassed,
    canTakePreTest,
    canTakePostTest,
    attendancePercentage,
    sessionsAttended: attendedSessions,
    totalSessions,
  };
}
