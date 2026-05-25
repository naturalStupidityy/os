import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import {
  users,
  kumbhEvents,
  sessions,
  exams,
  questions,
  certificates,
  systemConfig,
  attendanceRecords,
  examAttempts,
  tents,
} from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const client = postgres(connectionString);
const db = drizzle(client);

// ── Config Service Defaults ──
const DEFAULT_CONFIG = [
  { key: "attendance.threshold_percentage", value: "75", category: "attendance", description: "Minimum attendance percentage required for exam eligibility", valueType: "integer", minValue: 0, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "attendance.min_sessions_required", value: "9", category: "attendance", description: "Minimum number of attended sessions to qualify for exams", valueType: "integer", minValue: 0, maxValue: 20, editableByAdmin: true, requiresRestart: false },
  { key: "attendance.total_sessions", value: "12", category: "attendance", description: "Total number of attendance sessions in the training program", valueType: "integer", minValue: 1, maxValue: 50, editableByAdmin: true, requiresRestart: false },
  { key: "attendance.checkin_window_minutes", value: "30", category: "attendance", description: "Time window around session start for QR check-in", valueType: "integer", minValue: 5, maxValue: 120, editableByAdmin: true, requiresRestart: false },
  { key: "attendance.manual_override_enabled", value: "true", category: "attendance", description: "Allow instructors to manually override attendance records", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
  { key: "attendance.manual_override_grace_minutes", value: "15", category: "attendance", description: "Grace period after session ends for manual override", valueType: "integer", minValue: 0, maxValue: 60, editableByAdmin: true, requiresRestart: false },
  { key: "attendance.instructor_override_alert_threshold", value: "20", category: "attendance", description: "Alert admin if instructor manually marks more than this % of a batch", valueType: "integer", minValue: 0, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "tent.total_count", value: "15", category: "logistics", description: "Total number of tents available for volunteer accommodation", valueType: "integer", minValue: 1, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "tent.capacity_per_tent", value: "24", category: "logistics", description: "Maximum number of beds per tent", valueType: "integer", minValue: 1, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "tent.global_capacity_cap", value: "360", category: "logistics", description: "Global maximum volunteers for tent allocation", valueType: "integer", minValue: 0, maxValue: 5000, editableByAdmin: true, requiresRestart: false },
  { key: "tent.female_sector_start", value: "1", category: "logistics", description: "Starting tent number for female sector", valueType: "integer", minValue: 1, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "tent.female_sector_end", value: "7", category: "logistics", description: "Ending tent number for female sector", valueType: "integer", minValue: 1, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "tent.male_sector_start", value: "8", category: "logistics", description: "Starting tent number for male sector", valueType: "integer", minValue: 1, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "tent.male_sector_end", value: "15", category: "logistics", description: "Ending tent number for male sector", valueType: "integer", minValue: 1, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "tent.allocation_strategy", value: "fcfs_fill_full", category: "logistics", description: "Tent allocation strategy (fcfs_fill_full, fcfs_round_robin, gender_segregated)", valueType: "string", editableByAdmin: true, requiresRestart: false },
  { key: "exam.question_bank_size", value: "1000", category: "assessment", description: "Total questions available in the MCQ bank", valueType: "integer", minValue: 100, maxValue: 10000, editableByAdmin: true, requiresRestart: false },
  { key: "exam.question_count_pre_test", value: "15", category: "assessment", description: "Number of questions in the Day 1 Pre-Test", valueType: "integer", minValue: 5, maxValue: 50, editableByAdmin: true, requiresRestart: false },
  { key: "exam.question_count_post_test", value: "30", category: "assessment", description: "Number of questions in the Day 6 Post-Test", valueType: "integer", minValue: 10, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "exam.passing_score_percentage", value: "50", category: "assessment", description: "Minimum score percentage required to pass an exam", valueType: "integer", minValue: 0, maxValue: 100, editableByAdmin: true, requiresRestart: false },
  { key: "exam.max_attempts", value: "2", category: "assessment", description: "Maximum attempts allowed per exam per volunteer", valueType: "integer", minValue: 1, maxValue: 10, editableByAdmin: true, requiresRestart: false },
  { key: "exam.duration_minutes_pre_test", value: "30", category: "assessment", description: "Duration of the Day 1 Pre-Test in minutes", valueType: "integer", minValue: 10, maxValue: 120, editableByAdmin: true, requiresRestart: false },
  { key: "exam.duration_minutes_post_test", value: "60", category: "assessment", description: "Duration of the Day 6 Post-Test in minutes", valueType: "integer", minValue: 10, maxValue: 180, editableByAdmin: true, requiresRestart: false },
  { key: "exam.retake_allowed", value: "true", category: "assessment", description: "Allow volunteers to retake failed exams", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
  { key: "batch.training_days", value: "6", category: "batch", description: "Number of training days in a batch", valueType: "integer", minValue: 1, maxValue: 30, editableByAdmin: true, requiresRestart: false },
  { key: "batch.sessions_per_day", value: "2", category: "batch", description: "Number of sessions per day (morning and evening)", valueType: "integer", minValue: 1, maxValue: 5, editableByAdmin: true, requiresRestart: false },
  { key: "batch.max_volunteers_per_batch", value: "500", category: "batch", description: "Maximum volunteers per training batch", valueType: "integer", minValue: 10, maxValue: 1000, editableByAdmin: true, requiresRestart: false },
  { key: "batch.registration_cutoff_hours", value: "24", category: "batch", description: "Hours before batch start when registration closes", valueType: "integer", minValue: 0, maxValue: 168, editableByAdmin: true, requiresRestart: false },
  { key: "certificate.auto_generate", value: "true", category: "certificate", description: "Automatically generate certificates when volunteer passes exam and meets attendance", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
  { key: "certificate.require_both_attendance_and_exam", value: "true", category: "certificate", description: "Require both attendance threshold and exam pass for certificate issuance", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
  { key: "qr.validity_minutes", value: "15", category: "security", description: "QR code validity duration in minutes before expiry", valueType: "integer", minValue: 1, maxValue: 60, editableByAdmin: true, requiresRestart: false },
  { key: "notifications.sms_enabled", value: "false", category: "notifications", description: "Enable SMS notifications (requires external SMS API)", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
  { key: "notifications.whatsapp_enabled", value: "false", category: "notifications", description: "Enable WhatsApp notifications (requires external WhatsApp API)", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
  { key: "registration.enabled", value: "true", category: "general", description: "Allow new volunteer registrations through the system", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
  { key: "registration.max_per_day", value: "500", category: "general", description: "Maximum new registrations allowed per day", valueType: "integer", minValue: 1, maxValue: 2000, editableByAdmin: true, requiresRestart: false },
  { key: "registration.require_aadhaar", value: "false", category: "general", description: "Require Aadhaar verification during registration (requires external Aadhaar API)", valueType: "boolean", editableByAdmin: true, requiresRestart: false },
];

// ── Indian Names for 300 Volunteers ──
const FIRST_NAMES_MALE = [
  "Rahul", "Amit", "Vikram", "Suresh", "Ramesh", "Rajesh", "Mahesh", "Dinesh", "Naresh", "Mukesh",
  "Ajay", "Vijay", "Sanjay", "Anil", "Sunil", "Kamal", "Kunal", "Rohan", "Sohan", "Mohan",
  "Arun", "Varun", "Tarun", "Karan", "Harsh", "Akash", "Prakash", "Deepak", "Sudhir", "Mohit",
  "Rohit", "Sohit", "Nitin", "Pankaj", "Manoj", "Saroj", "Manish", "Danish", "Satish", "Harish",
  "Girish", "Rakesh", "Lokesh", "Yogesh", "Bhavesh", "Prashant", "Nishant", "Vishal", "Piyush", "Ayush",
  "Sachin", "Vipin", "Arvind", "Devendra", "Gajendra", "Mahendra", "Narendra", "Jitendra", "Rajendra", "Ravindra",
  "Gopal", "Madhav", "Keshav", "Pranav", "Manav", "Saurav", "Gaurav", "Bharat", "Suraj", "Neeraj",
  "Dhiraj", "Kiran", "Milan", "Naman", "Suman", "Kartik", "Aakash", "Vivek", "Ashok", "Alok",
  "Atul", "Ankur", "Mayank", "Chirag", "Hemant", "Sandeep", "Pradeep", "Navdeep", "Jaideep", "Sudeep",
  "Abhishek", "Nikhil", "Rahul", "Kunal", "Rohan", "Aditya", "Siddharth", "Harshit", "Prateek", "Shubham",
  "Vikas", "Vinod", "Virendra", "Yashwant", "Vishnu", "Shiva", "Krishna", "Ram", "Lakhan", "Balram",
  "Naveen", "Praveen", "Ravi", "Shankar", "Ganesh", "Mahesh", "Lalit", "Mohit", "Rohit", "Sohit",
  "Aman", "Kamal", "Bimal", "Nirmal", "Kunal", "Mukul", "Atul", "Sonal", "Chirag", "Deepak",
  "Raj", "Ajeet", "Amit", "Ankit", "Arpit", "Divyansh", "Harsh", "Ishan", "Kartik", "Lalit",
  "Mohit", "Nakul", "Om", "Pranav", "Raghav", "Sahil", "Tushar", "Utkarsh", "Vansh", "Yash",
];

const FIRST_NAMES_FEMALE = [
  "Priya", "Sneha", "Pooja", "Neha", "Megha", "Kavita", "Sunita", "Anita", "Sarita", "Rita",
  "Geeta", "Seema", "Reema", "Nisha", "Disha", "Asha", "Usha", "Sushma", "Shweta", "Babita",
  "Rani", "Kiran", "Madhu", "Sudha", "Vidya", "Maya", "Lata", "Aarti", "Swati", "Komal",
  "Divya", "Kavya", "Ananya", "Ishita", "Prachi", "Sakshi", "Tanya", "Riya", "Nidhi", "Kriti",
  "Shruti", "Preeti", "Mansi", "Tanvi", "Neelam", "Poonam", "Rekha", "Suman", "Ganga", "Yamuna",
  "Radha", "Sita", "Meera", "Draupadi", "Kunti", "Ahilya", "Anjali", "Manju", "Sushila", "Kamla",
  "Saraswati", "Lakshmi", "Durga", "Parvati", "Kali", "Gauri", "Uma", "Sita", "Lata", "Asha",
  "Meena", "Veena", "Leena", "Teena", "Reena", "Sheena", "Nina", "Tina", "Dina", "Hina",
  "Sonia", "Monica", "Veronica", "Rachel", "Rohini", "Mrinalini", "Sharadini", "Nalini", "Malini", "Kalpana",
  "Arpita", "Shilpa", "Sangita", "Bandita", "Namita", "Mamta", "Sushmita", "Susmita", "Rupali", "Sonali",
  "Kajal", "Mrunal", "Rupal", "Bipasha", "Deepika", "Priyanka", "Anushka", "Katrina", "Kareena", "Karisma",
  "Juhi", "Madhuri", "Sridevi", "Hema", "Rekha", "Jaya", "Shabana", "Nutan", "Waheeda", "Asha",
  "Helen", "Zeenat", "Parveen", "Dimple", "Poonam", "Neetu", "Rakhee", "Sharmila", "Tanuja", "Nanda",
  "Saira", "Meena", "Vyjayanthi", "Sadhana", "Nargis", "Suraiya", "Noor", "Shamim", "Ragini", "Padmini",
  "Nalini", "Leela", "Devika", "Geetanjali", "Annapurna", "Chandrakala", "Rajeshwari", "Parameshwari", "Lakshmidevi", "Savitri",
];

const LAST_NAMES = [
  "Sharma", "Patel", "Kumar", "Gupta", "Singh", "Verma", "Reddy", "Nair", "Rao", "Iyer",
  "Joshi", "Mehta", "Shah", "Desai", "Pandey", "Tiwari", "Mishra", "Agarwal", "Banerjee", "Chatterjee",
  "Das", "Malhotra", "Khanna", "Kapoor", "Chopra", "Bhat", "Rao", "Menon", "Pillai", "Nambiar",
  "Kulkarni", "Deshpande", "Joshi", "Ahuja", "Bajaj", "Dutta", "Ghosh", "Mukherjee", "Sengupta", "Bhattacharya",
  "Iyer", "Srinivasan", "Subramanian", "Ranganathan", "Venkataraman", "Krishnamurthy", "Narayanan", "Ramaswamy", "Venkatesh", "Gopalan",
  "Chauhan", "Tomar", "Rathore", "Solanki", "Bhati", "Shekhawat", "Kachhwaha", "Sisodia", "Hada", "Chundawat",
  "Yadav", "Jadav", "Ahir", "Gwala", "Sadgope", "Mandal", "Dewan", "Sarkar", "Biswas", "Majumdar",
  "Thakur", "Singh", "Rana", "Mewar", "Chandel", "Bundela", "Parihar", "Dodiya", "Gohil", "Jadeja",
  "Prajapati", "Suthar", "Mistry", "Gajjar", "Panchal", "Chaudhary", "Maurya", "Kushwaha", "Shakya", "Pal",
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(index: number): string {
  return `9${String(Math.floor(Math.random() * 900000000) + 100000000)}`;
}

const UNITS = ["Unit A", "Unit B", "Unit C", "Unit D", "Unit E", "Unit F", "Unit G", "Unit H", "Medical Unit", "Logistics Unit"];

async function seed() {
  console.log("[Seed] Starting comprehensive database seed...");

  // ── Seed System Config ──
  console.log("[Seed] Inserting system config...");
  for (const config of DEFAULT_CONFIG) {
    const existing = await db.select().from(systemConfig).where(eq(systemConfig.key, config.key)).limit(1);
    if (existing.length === 0) {
      await db.insert(systemConfig).values(config);
    }
  }

  // ── Seed Admin Users ──
  console.log("[Seed] Inserting admin users...");
  const adminData = [
    { vid: "VK-2025-0001", fullName: "System Admin", firstName: "System", lastName: "Admin", email: "admin@vkumbh.org", mobileNumber: "9876543200", role: "admin" as const, unit: "CHMES HQ", designation: "Training Director", gender: "male", isVerified: true, status: "active" as const, isActive: true, attendance: 100 },
  ];
  for (const admin of adminData) {
    const existing = await db.select().from(users).where(eq(users.vid, admin.vid)).limit(1);
    if (existing.length === 0) {
      await db.insert(users).values(admin);
    }
  }

  // ── Seed Instructors ──
  console.log("[Seed] Inserting instructors...");
  const instructorData = [
    { vid: "VK-2025-2001", fullName: "Lead Instructor", firstName: "Lead", lastName: "Instructor", email: "instructor1@vkumbh.org", mobileNumber: "9876543201", role: "instructor" as const, unit: "CHMES Training Wing", designation: "Lead Instructor", gender: "male", isVerified: true, status: "active" as const, isActive: true, attendance: 100 },
    { vid: "VK-2025-2002", fullName: "Disaster Expert", firstName: "Disaster", lastName: "Expert", email: "instructor2@vkumbh.org", mobileNumber: "9876543202", role: "instructor" as const, unit: "DES PU", designation: "Disaster Management Expert", gender: "female", isVerified: true, status: "active" as const, isActive: true, attendance: 98 },
    { vid: "VK-2025-2003", fullName: "Crowd Specialist", firstName: "Crowd", lastName: "Specialist", email: "instructor3@vkumbh.org", mobileNumber: "9876543203", role: "instructor" as const, unit: "CHMES Training Wing", designation: "Crowd Control Specialist", gender: "male", isVerified: true, status: "active" as const, isActive: true, attendance: 96 },
  ];
  for (const inst of instructorData) {
    const existing = await db.select().from(users).where(eq(users.vid, inst.vid)).limit(1);
    if (existing.length === 0) {
      await db.insert(users).values(inst);
    }
  }

  // ── Seed Assessment Admin ──
  console.log("[Seed] Inserting assessment admin...");
  const asmData = [
    { vid: "VK-2025-3001", fullName: "Assessment Coordinator", firstName: "Assessment", lastName: "Coordinator", email: "assessment@vkumbh.org", mobileNumber: "9876543204", role: "assessment_admin" as const, unit: "DES PU", designation: "Assessment Coordinator", gender: "female", isVerified: true, status: "active" as const, isActive: true, attendance: 100 },
  ];
  for (const asm of asmData) {
    const existing = await db.select().from(users).where(eq(users.vid, asm.vid)).limit(1);
    if (existing.length === 0) {
      await db.insert(users).values(asm);
    }
  }

  // ── Seed 300 Volunteers ──
  console.log("[Seed] Inserting 300 volunteers...");
  const existingVols = await db.select().from(users).where(eq(users.role, "volunteer"));
  const existingCount = existingVols.length;

  if (existingCount < 300) {
    const toCreate = 300 - existingCount;
    for (let i = 0; i < toCreate; i++) {
      const globalIndex = existingCount + i;
      const isMale = globalIndex % 2 === 0;
      const firstName = isMale ? getRandomItem(FIRST_NAMES_MALE) : getRandomItem(FIRST_NAMES_FEMALE);
      const lastName = getRandomItem(LAST_NAMES);
      const fullName = `${firstName} ${lastName}`;
      const vid = `VK-2025-1${String(globalIndex + 1).padStart(4, "0")}`;
      const phone = generatePhone(globalIndex);
      const unit = getRandomItem(UNITS);

      await db.insert(users).values({
        vid,
        firstName,
        lastName,
        fullName,
        email: `vol${globalIndex + 1}@vkumbh.org`,
        mobileNumber: phone,
        role: "volunteer",
        gender: isMale ? "male" : "female",
        unit,
        designation: "Volunteer",
        isVerified: true,
        status: "active",
        isActive: true,
        attendance: 0,
      });
    }
  }
  console.log(`[Seed] Total volunteers: ${existingCount + Math.max(0, 300 - existingCount)}`);

  // ── Seed Event ──
  console.log("[Seed] Inserting event...");
  const existingEvents = await db.select().from(kumbhEvents).limit(1);
  let eventId;
  if (existingEvents.length === 0) {
    const result = await db.insert(kumbhEvents).values({
      name: "VKumbh 2025 Training",
      location: "Ujjain",
      startDate: new Date("2025-04-01"),
      endDate: new Date("2025-04-15"),
      status: "active",
      maxVolunteers: 5000,
      attendanceThreshold: 75,
    }).returning();
    eventId = result[0].id;
  } else {
    eventId = existingEvents[0].id;
  }

  // Get instructor IDs
  const instructorRows = await db.select().from(users).where(eq(users.role, "instructor"));
  const inst1 = instructorRows[0]?.id;
  const inst2 = instructorRows[1]?.id;
  const inst3 = instructorRows[2]?.id;

  // ── Seed Sessions (6 days x 2 sessions = 12 sessions) ──
  // Day 1-4: Completed (morning + evening)
  // Day 5: Morning completed, Evening remaining (to be demonstrated)
  // Day 6: Both scheduled (for exams)
  console.log("[Seed] Inserting 12 sessions (6 days x 2)...");
  const existingSessions = await db.select().from(sessions).limit(1);
  if (existingSessions.length === 0) {
    const sessionData = [
      // ── Day 1 (Completed) ──
      { eventId, name: "Day 1 Morning: Orientation & Behavioral Training", slot: "morning" as const, date: new Date("2025-04-01"), venue: "Hall A", capacity: 500, enrolled: 300, attended: 300, instructorId: inst1, status: "completed" as const, timeStart: "09:00", timeEnd: "12:00" },
      { eventId, name: "Day 1 Evening: First Aid Basics", slot: "evening" as const, date: new Date("2025-04-01"), venue: "Hall B", capacity: 500, enrolled: 300, attended: 300, instructorId: inst2, status: "completed" as const, timeStart: "14:00", timeEnd: "17:00" },
      // ── Day 2 (Completed) ──
      { eventId, name: "Day 2 Morning: Disaster Management", slot: "morning" as const, date: new Date("2025-04-02"), venue: "Hall A", capacity: 500, enrolled: 300, attended: 300, instructorId: inst1, status: "completed" as const, timeStart: "09:00", timeEnd: "12:00" },
      { eventId, name: "Day 2 Evening: Crowd Control Techniques", slot: "evening" as const, date: new Date("2025-04-02"), venue: "Training Ground", capacity: 500, enrolled: 300, attended: 300, instructorId: inst3, status: "completed" as const, timeStart: "14:00", timeEnd: "17:00" },
      // ── Day 3 (Completed) ──
      { eventId, name: "Day 3 Morning: Emergency Response", slot: "morning" as const, date: new Date("2025-04-03"), venue: "Field Area", capacity: 500, enrolled: 300, attended: 300, instructorId: inst3, status: "completed" as const, timeStart: "09:00", timeEnd: "12:00" },
      { eventId, name: "Day 3 Evening: Communication Protocols", slot: "evening" as const, date: new Date("2025-04-03"), venue: "Hall C", capacity: 500, enrolled: 300, attended: 300, instructorId: inst2, status: "completed" as const, timeStart: "14:00", timeEnd: "17:00" },
      // ── Day 4 (Completed) ──
      { eventId, name: "Day 4 Morning: Fire Safety & Evacuation", slot: "morning" as const, date: new Date("2025-04-04"), venue: "Hall A", capacity: 500, enrolled: 300, attended: 300, instructorId: inst1, status: "completed" as const, timeStart: "09:00", timeEnd: "12:00" },
      { eventId, name: "Day 4 Evening: Practical Simulation I", slot: "evening" as const, date: new Date("2025-04-04"), venue: "Training Ground", capacity: 500, enrolled: 300, attended: 300, instructorId: inst3, status: "completed" as const, timeStart: "14:00", timeEnd: "17:00" },
      // ── Day 5 (Morning completed, Evening remaining for demo) ──
      { eventId, name: "Day 5 Morning: Leadership & Team Coordination", slot: "morning" as const, date: new Date("2025-04-05"), venue: "Hall A", capacity: 500, enrolled: 300, attended: 300, instructorId: inst1, status: "completed" as const, timeStart: "09:00", timeEnd: "12:00" },
      { eventId, name: "Day 5 Evening: Practical Simulation II [MARK THIS]", slot: "evening" as const, date: new Date("2025-04-05"), venue: "Training Ground", capacity: 500, enrolled: 300, attended: 0, instructorId: inst2, status: "scheduled" as const, timeStart: "14:00", timeEnd: "17:00" },
      // ── Day 6 (Scheduled - Exam Day) ──
      { eventId, name: "Day 6 Morning: Final Review Session", slot: "morning" as const, date: new Date("2025-04-06"), venue: "Hall A", capacity: 500, enrolled: 300, attended: 0, instructorId: inst1, status: "scheduled" as const, timeStart: "09:00", timeEnd: "11:00" },
      { eventId, name: "Day 6 Evening: Post-Test Examination", slot: "evening" as const, date: new Date("2025-04-06"), venue: "Hall A", capacity: 500, enrolled: 300, attended: 0, instructorId: inst2, status: "scheduled" as const, timeStart: "14:00", timeEnd: "16:00" },
    ];

    for (const sess of sessionData) {
      await db.insert(sessions).values(sess);
    }
  }

  // Get all session IDs for attendance seeding
  const allSessions = await db.select().from(sessions);
  const completedSessions = allSessions.filter((s) => s.status === "completed");
  const scheduledSessions = allSessions.filter((s) => s.status === "scheduled");

  console.log(`[Seed] Found ${completedSessions.length} completed sessions and ${scheduledSessions.length} scheduled sessions.`);

  // ── Seed Attendance for Completed Sessions ──
  // All 300 volunteers have 100% attendance for completed sessions
  console.log("[Seed] Marking attendance for completed sessions...");
  const allVolunteers = await db.select().from(users).where(eq(users.role, "volunteer"));

  for (const session of completedSessions) {
    // Check if attendance already exists for this session
    const existing = await db.select().from(attendanceRecords)
      .where(eq(attendanceRecords.sessionId, session.id))
      .limit(1);

    if (existing.length === 0) {
      // Insert attendance for all volunteers
      const attendanceData = allVolunteers.map((vol) => ({
        userId: vol.id,
        userName: vol.fullName,
        sessionId: session.id,
        eventId: session.eventId,
        status: "present" as const,
        checkInAt: new Date(session.date!),
        checkInMethod: "qr",
      }));

      // Insert in batches of 50 to avoid query size limits
      for (let i = 0; i < attendanceData.length; i += 50) {
        const batch = attendanceData.slice(i, i + 50);
        await db.insert(attendanceRecords).values(batch);
      }

      // Update session attended count
      await db.update(sessions)
        .set({ attended: allVolunteers.length })
        .where(eq(sessions.id, session.id));

      console.log(`[Seed] Marked ${allVolunteers.length} volunteers present for: ${session.name}`);
    }
  }

  // ── Seed Exams ──
  console.log("[Seed] Inserting exams...");
  const existingExams = await db.select().from(exams).limit(1);
  if (existingExams.length === 0) {
    await db.insert(exams).values([
      { eventId, name: "Pre-Test: Basic Training Assessment", type: "pre_test" as const, status: "published" as const, durationMinutes: 30, passingScore: 50, maxAttempts: 1, questionCount: 15, instructions: "Answer all 15 questions. Minimum 50% required to pass. This is a diagnostic test to assess your baseline knowledge before training begins." },
      { eventId, name: "Post-Test: Comprehensive Assessment", type: "post_test" as const, status: "published" as const, durationMinutes: 60, passingScore: 50, maxAttempts: 2, questionCount: 30, instructions: "Comprehensive assessment covering all 6 training modules. Minimum 50% required to pass. You must complete all training sessions and the Pre-Test before attempting this exam." },
    ]);
  }

  // ── Seed Questions (15 pre-test + 30 post-test = 45 total) ──
  console.log("[Seed] Inserting questions...");
  const existingQuestions = await db.select().from(questions).limit(1);
  if (existingQuestions.length === 0) {
    const examRows = await db.select().from(exams);
    const preTestId = examRows.find((e) => e.type === "pre_test")?.id;
    const postTestId = examRows.find((e) => e.type === "post_test")?.id;

    if (preTestId && postTestId) {
      const preTestQuestions = [
        { examId: preTestId, question: "What is the primary purpose of the VKumbh volunteer training program?", options: { a: "To certify volunteers for Kumbh Mela duty", b: "To provide general education", c: "To recruit military personnel", d: "To organize religious ceremonies" }, correctAnswer: "a", difficulty: "easy", category: "General", explanation: "The VKumbh program specifically trains and certifies volunteers for the Kumbh Mela event.", orderIndex: 0 },
        { examId: preTestId, question: "Which of the following is NOT a training module in the VKumbh program?", options: { a: "Behavioral Modification", b: "Disaster Management", c: "Financial Accounting", d: "Crowd Control" }, correctAnswer: "c", difficulty: "easy", category: "General", explanation: "Financial Accounting is not part of the volunteer training curriculum.", orderIndex: 1 },
        { examId: preTestId, question: "How many days does the standard VKumbh training program last?", options: { a: "3 days", b: "5 days", c: "6 days", d: "10 days" }, correctAnswer: "c", difficulty: "easy", category: "General", explanation: "The standard training program spans 6 days with morning and evening sessions.", orderIndex: 2 },
        { examId: preTestId, question: "What is the minimum attendance percentage required for exam eligibility?", options: { a: "60%", b: "75%", c: "90%", d: "100%" }, correctAnswer: "b", difficulty: "easy", category: "Attendance", explanation: "A minimum of 75% attendance is required to be eligible for the final examination.", orderIndex: 3 },
        { examId: preTestId, question: "Who is authorized to generate QR codes for attendance marking?", options: { a: "Any volunteer", b: "Only instructors", c: "System admin only", d: "Assessment coordinators" }, correctAnswer: "b", difficulty: "easy", category: "General", explanation: "Only designated instructors have the authority to generate QR codes for session attendance.", orderIndex: 4 },
        { examId: preTestId, question: "In case of a stampede, what is the first action a volunteer should take?", options: { a: "Run away from the crowd", b: "Try to stop the crowd physically", c: "Stay calm and alert authorities using protocol", d: "Shout at people to stop" }, correctAnswer: "c", difficulty: "easy", category: "Crowd Control", explanation: "The first rule is to stay calm and follow the communication protocol to alert emergency services.", orderIndex: 5 },
        { examId: preTestId, question: "What does CPR stand for?", options: { a: "Cardiac Patient Recovery", b: "Cardiopulmonary Resuscitation", c: "Critical Patient Response", d: "Cardiac Pulse Restoration" }, correctAnswer: "b", difficulty: "easy", category: "First Aid", explanation: "CPR is Cardiopulmonary Resuscitation, a life-saving technique used in emergencies.", orderIndex: 6 },
        { examId: preTestId, question: "During an earthquake, the safest position is:", options: { a: "Near a window for easy escape", b: "Under a sturdy table or desk", c: "In an elevator to go down quickly", d: "Near tall furniture for support" }, correctAnswer: "b", difficulty: "easy", category: "Disaster Management", explanation: "Drop, Cover, and Hold Under - getting under sturdy furniture protects from falling debris.", orderIndex: 7 },
        { examId: preTestId, question: "What is the emergency helpline number in India for police?", options: { a: "101", b: "102", c: "100", d: "108" }, correctAnswer: "c", difficulty: "easy", category: "General", explanation: "100 is the police emergency number. 101 is fire, 102 is ambulance, 108 is emergency response.", orderIndex: 8 },
        { examId: preTestId, question: "A volunteer notices an unattended bag in a crowded area. What should they do?", options: { a: "Open it to check contents", b: "Ignore it and continue duties", c: "Report immediately to security/police without touching", d: "Move it to a less crowded area" }, correctAnswer: "c", difficulty: "easy", category: "Security", explanation: "Never touch suspicious items. Report immediately to security personnel.", orderIndex: 9 },
        { examId: preTestId, question: "Which fire extinguisher type is safe for electrical fires?", options: { a: "Water-based (Class A)", b: "Foam (Class B)", c: "CO2 or Dry Powder (Class C)", d: "Wet Chemical (Class F)" }, correctAnswer: "c", difficulty: "medium", category: "Fire Safety", explanation: "CO2 and Dry Powder extinguishers are safe for electrical fires as they don't conduct electricity.", orderIndex: 10 },
        { examId: preTestId, question: "The 'Behavioral Modification' module primarily focuses on:", options: { a: "Changing volunteer salary structures", b: "Managing crowd psychology and de-escalation", c: "Recruiting more volunteers", d: "Building temporary structures" }, correctAnswer: "b", difficulty: "easy", category: "Behavioral", explanation: "Behavioral modification teaches crowd psychology, patience, and de-escalation techniques.", orderIndex: 11 },
        { examId: preTestId, question: "What is the recommended response to a fire alarm in a tent area?", options: { a: "Continue sleeping if the fire is far", b: "Quickly evacuate using designated routes", c: "Try to extinguish the fire yourself first", d: "Take photos before leaving" }, correctAnswer: "b", difficulty: "easy", category: "Fire Safety", explanation: "Immediate evacuation using designated routes is the correct response to any fire alarm.", orderIndex: 12 },
        { examId: preTestId, question: "Volunteers should report to their Unit Commander:", options: { a: "Only at the start of the day", b: "Only during emergencies", c: "At scheduled check-in times and during incidents", d: "Only when they need leave" }, correctAnswer: "c", difficulty: "easy", category: "General", explanation: "Regular check-ins and incident reporting are essential for coordination.", orderIndex: 13 },
        { examId: preTestId, question: "What does the 'Golden Hour' refer to in emergency medical response?", options: { a: "The first hour after sunrise", b: "The critical first hour after injury when treatment is most effective", c: "The lunch break hour", d: "The final hour of training" }, correctAnswer: "b", difficulty: "medium", category: "First Aid", explanation: "The Golden Hour is the first hour after traumatic injury when prompt medical treatment has the highest chance of preventing death.", orderIndex: 14 },
      ];

      const postTestQuestions = [
        { examId: postTestId, question: "When managing a crowd surge, what is the most effective technique?", options: { a: "Push back against the crowd", b: "Create diversions and open alternative exit routes", c: "Shout at people to go back", d: "Close all gates immediately" }, correctAnswer: "b", difficulty: "medium", category: "Crowd Control", explanation: "Opening alternative routes and creating controlled diversions is the most effective crowd management technique.", orderIndex: 0 },
        { examId: postTestId, question: "In triage, a patient with severe bleeding but responsive would be categorized as:", options: { a: "Green (Minor)", b: "Yellow (Delayed)", c: "Red (Immediate)", d: "Black (Deceased/Expectant)" }, correctAnswer: "c", difficulty: "medium", category: "First Aid", explanation: "Severe bleeding requires immediate attention (Red category) to prevent fatal blood loss.", orderIndex: 1 },
        { examId: postTestId, question: "Which of the following is NOT a sign of heat stroke?", options: { a: "High body temperature (above 40C)", b: "Profuse sweating", c: "Altered mental state", d: "Hot, dry skin" }, correctAnswer: "b", difficulty: "medium", category: "First Aid", explanation: "Heat stroke is characterized by HOT, DRY skin (no sweating). Profuse sweating indicates heat exhaustion, not heat stroke.", orderIndex: 2 },
        { examId: postTestId, question: "The PASS technique for fire extinguishers stands for:", options: { a: "Pull, Aim, Squeeze, Sweep", b: "Push, Aim, Spray, Sweep", c: "Pull, Aim, Spray, Stand", d: "Push, Aim, Squeeze, Stand" }, correctAnswer: "a", difficulty: "easy", category: "Fire Safety", explanation: "PASS: Pull the pin, Aim at the base, Squeeze the handle, Sweep side to side.", orderIndex: 3 },
        { examId: postTestId, question: "During a chemical spill, the first step is to:", options: { a: "Clean it up immediately", b: "Evacuate the area and alert authorities", c: "Smell it to identify the chemical", d: "Pour water on it" }, correctAnswer: "b", difficulty: "easy", category: "Disaster Management", explanation: "Evacuation and alerting authorities is the correct first step for any chemical spill.", orderIndex: 4 },
        { examId: postTestId, question: "A volunteer should use the Heimlich maneuver when:", options: { a: "Someone is having a heart attack", b: "Someone is choking and cannot breathe or speak", c: "Someone has fainted", d: "Someone has a broken arm" }, correctAnswer: "b", difficulty: "easy", category: "First Aid", explanation: "The Heimlich maneuver is specifically for clearing airway obstruction in choking victims.", orderIndex: 5 },
        { examId: postTestId, question: "What is the correct compression-to-breath ratio for adult CPR with one rescuer?", options: { a: "15:2", b: "30:2", c: "15:1", d: "30:1" }, correctAnswer: "b", difficulty: "medium", category: "First Aid", explanation: "For adult CPR with one rescuer, the ratio is 30 compressions to 2 breaths.", orderIndex: 6 },
        { examId: postTestId, question: "Which communication protocol is most effective during a network outage?", options: { a: "Wait for the network to return", b: "Use pre-designated runner system and whistle signals", c: "Shout loudly across the venue", d: "Send emails" }, correctAnswer: "b", difficulty: "medium", category: "Communication", explanation: "Runner systems and whistle signals are part of offline communication protocols for network failures.", orderIndex: 7 },
        { examId: postTestId, question: "In disaster management, the 'Cluster Approach' involves:", options: { a: "Grouping volunteers by height", b: "Organizing response by sectors (Health, Logistics, Shelter, etc.)", c: "Keeping all volunteers in one location", d: "Random assignment of duties" }, correctAnswer: "b", difficulty: "medium", category: "Disaster Management", explanation: "The Cluster Approach organizes response into specialized sectors for efficient coordination.", orderIndex: 8 },
        { examId: postTestId, question: "When dealing with an aggressive crowd member, a volunteer should:", options: { a: "Match their aggression", b: "Use de-escalation techniques and call for backup", c: "Ignore them completely", d: "Physically restrain them alone" }, correctAnswer: "b", difficulty: "easy", category: "Behavioral", explanation: "De-escalation and calling for backup are the correct behavioral modification responses.", orderIndex: 9 },
        { examId: postTestId, question: "The RICE method for injuries stands for:", options: { a: "Run, Ice, Compress, Elevate", b: "Rest, Ice, Compress, Elevate", c: "Rest, Inspect, Compress, Elevate", d: "Run, Inspect, Cool, Elevate" }, correctAnswer: "b", difficulty: "easy", category: "First Aid", explanation: "RICE: Rest, Ice, Compression, Elevation - standard treatment for sprains and strains.", orderIndex: 10 },
        { examId: postTestId, question: "Which of the following is a sign of a fracture?", options: { a: "Swelling and deformity at the site", b: "Slight itching", c: "Mild headache", d: "Runny nose" }, correctAnswer: "a", difficulty: "easy", category: "First Aid", explanation: "Swelling, deformity, and inability to move are key signs of a fracture.", orderIndex: 11 },
        { examId: postTestId, question: "During an evacuation, volunteers should prioritize:", options: { a: "Saving equipment first", b: "Elderly, children, and disabled individuals", c: "Themselves first", d: "Following the loudest voice" }, correctAnswer: "b", difficulty: "easy", category: "Disaster Management", explanation: "Vulnerable populations are prioritized during evacuations.", orderIndex: 12 },
        { examId: postTestId, question: "What is the maximum number of attempts allowed for the Post-Test exam?", options: { a: "1", b: "2", c: "3", d: "Unlimited" }, correctAnswer: "b", difficulty: "easy", category: "General", explanation: "Volunteers are allowed a maximum of 2 attempts to pass the Post-Test examination.", orderIndex: 13 },
        { examId: postTestId, question: "A volunteer finds an unconscious person who is breathing. The correct position is:", options: { a: "Flat on their back", b: "Recovery position (on their side)", c: "Sitting upright", d: "Standing position" }, correctAnswer: "b", difficulty: "medium", category: "First Aid", explanation: "The recovery position keeps the airway open and prevents choking on vomit.", orderIndex: 14 },
        { examId: postTestId, question: "What does ICS stand for in emergency management?", options: { a: "Indian Crowd Service", b: "Incident Command System", c: "Internal Control Service", d: "Integrated Crowd Strategy" }, correctAnswer: "b", difficulty: "medium", category: "Disaster Management", explanation: "ICS (Incident Command System) is a standardized approach to emergency management.", orderIndex: 15 },
        { examId: postTestId, question: "When should a tourniquet be used?", options: { a: "For any cut or scrape", b: "Only when direct pressure fails to stop severe bleeding", c: "For headaches", d: "For sprained ankles" }, correctAnswer: "b", difficulty: "medium", category: "First Aid", explanation: "Tourniquets are last-resort measures for life-threatening bleeding when direct pressure fails.", orderIndex: 16 },
        { examId: postTestId, question: "The most common cause of death in fires is:", options: { a: "Burns", b: "Smoke inhalation", c: "Falling debris", d: "Explosion" }, correctAnswer: "b", difficulty: "easy", category: "Fire Safety", explanation: "Smoke inhalation is the leading cause of death in fires, not burns.", orderIndex: 17 },
        { examId: postTestId, question: "In a stampede situation, if you fall you should:", options: { a: "Try to stand up immediately", b: "Curl into a ball protecting your head and neck", c: "Lie flat on your stomach", d: "Spread your arms and legs" }, correctAnswer: "b", difficulty: "medium", category: "Crowd Control", explanation: "Curling into a ball protects vital organs, head, and neck from trampling.", orderIndex: 18 },
        { examId: postTestId, question: "Which of the following is a psychological first aid principle?", options: { a: "Force people to talk about their experience", b: "Listen actively, provide safety, and connect to support", c: "Tell them to 'just get over it'", d: "Avoid all contact with affected individuals" }, correctAnswer: "b", difficulty: "medium", category: "Behavioral", explanation: "Psychological first aid focuses on safety, calm, connectedness, and hope.", orderIndex: 19 },
        { examId: postTestId, question: "What is the primary role of the 'Tent Allocation' system?", options: { a: "To assign volunteers to training sessions", b: "To manage volunteer accommodation by gender and capacity", c: "To distribute food", d: "To track exam scores" }, correctAnswer: "b", difficulty: "easy", category: "Logistics", explanation: "Tent allocation manages volunteer accommodation, segregating by gender and respecting capacity limits.", orderIndex: 20 },
        { examId: postTestId, question: "When using an AED (Automated External Defibrillator), you should:", options: { a: "Use it on a wet surface without drying", b: "Ensure the chest is dry and follow voice prompts", c: "Place pads over clothing", d: "Use it while the patient is in water" }, correctAnswer: "b", difficulty: "medium", category: "First Aid", explanation: "AEDs require a dry chest surface. Follow voice prompts and place pads directly on skin.", orderIndex: 21 },
        { examId: postTestId, question: "The 'Chain of Survival' for cardiac arrest includes all EXCEPT:", options: { a: "Early recognition and calling for help", b: "Early CPR", c: "Early defibrillation", d: "Early medication administration by volunteers" }, correctAnswer: "d", difficulty: "medium", category: "First Aid", explanation: "Volunteers are not authorized to administer medications. The Chain of Survival includes recognition, CPR, defibrillation, and advanced care.", orderIndex: 22 },
        { examId: postTestId, question: "During a lost child situation, a volunteer should:", options: { a: "Take the child home", b: "Take the child to the designated Lost Child Center and alert authorities", c: "Give the child candy and wait", d: "Post on social media" }, correctAnswer: "b", difficulty: "easy", category: "General", explanation: "Lost children must be taken to designated centers and authorities must be notified immediately.", orderIndex: 23 },
        { examId: postTestId, question: "What percentage score is required to pass the VKumbh exams?", options: { a: "40%", b: "50%", c: "60%", d: "75%" }, correctAnswer: "b", difficulty: "easy", category: "General", explanation: "A minimum score of 50% is required to pass both Pre-Test and Post-Test examinations.", orderIndex: 24 },
        { examId: postTestId, question: "In a mass casualty incident, triage color coding 'Yellow' means:", options: { a: "Minor injuries", b: "Delayed treatment - serious but stable", c: "Immediate treatment required", d: "Deceased" }, correctAnswer: "b", difficulty: "medium", category: "First Aid", explanation: "Yellow (Delayed) patients need treatment but are stable enough to wait.", orderIndex: 25 },
        { examId: postTestId, question: "A volunteer should wash their hands for at least:", options: { a: "5 seconds", b: "10 seconds", c: "20 seconds", d: "1 minute" }, correctAnswer: "c", difficulty: "easy", category: "First Aid", explanation: "Proper handwashing requires at least 20 seconds with soap and water.", orderIndex: 26 },
        { examId: postTestId, question: "The best way to prevent the spread of infection at a mass gathering is:", options: { a: "Give everyone antibiotics", b: "Hand hygiene, proper waste disposal, and crowd spacing", c: "No physical contact between anyone", d: "Spray everyone with disinfectant" }, correctAnswer: "b", difficulty: "easy", category: "General", explanation: "Hand hygiene, proper waste management, and maintaining appropriate crowd density are key infection prevention measures.", orderIndex: 27 },
        { examId: postTestId, question: "When should a volunteer use PPE (Personal Protective Equipment)?", options: { a: "Only during formal ceremonies", b: "When there is risk of exposure to bodily fluids or hazardous materials", c: "At all times regardless of situation", d: "Only when instructed by media" }, correctAnswer: "b", difficulty: "easy", category: "First Aid", explanation: "PPE is used when there's risk of exposure to bodily fluids, blood, or hazardous materials.", orderIndex: 28 },
        { examId: postTestId, question: "The most important quality of a VKumbh volunteer is:", options: { a: "Physical strength", b: "Calm demeanor, empathy, and adherence to protocol", c: "Ability to speak multiple languages", d: "Previous military experience" }, correctAnswer: "b", difficulty: "easy", category: "Behavioral", explanation: "While useful, physical strength and language skills are secondary to calm behavior, empathy, and protocol adherence.", orderIndex: 29 },
      ];

      await db.insert(questions).values(preTestQuestions);
      await db.insert(questions).values(postTestQuestions);
      console.log("[Seed] Inserted 15 pre-test and 30 post-test questions.");
    }
  }

  // ── Seed Tents ──
  console.log("[Seed] Inserting tents...");
  const existingTents = await db.select().from(tents).limit(1);
  if (existingTents.length === 0) {
    for (let i = 1; i <= 15; i++) {
      const gender = i <= 7 ? "female" : "male";
      const sector = i <= 7 ? "female" : "male";
      const occupied = Math.floor(Math.random() * 20) + 2;

      await db.insert(tents).values({
        tentNumber: `T-${String(i).padStart(3, '0')}`,
        name: `Tent ${i}`,
        sector,
        gender,
        capacity: 24,
        occupied: Math.min(occupied, 24),
        location: `Sector ${sector === "female" ? "A" : "B"} - Row ${Math.ceil(i / 3)}`,
        facilities: ["Beds", "Lighting", "Storage", "Fan"],
        status: "active",
      });
    }
    console.log("[Seed] Inserted 15 tents.");
  }

  console.log("[Seed] ==================================================");
  console.log("[Seed] SEED COMPLETE - DEMO SCENARIO SUMMARY:");
  console.log("[Seed] ==================================================");
  console.log("[Seed] - 300 volunteers seeded with diverse Indian names");
  console.log("[Seed] - 12 sessions across 6 days (2 per day)");
  console.log("[Seed] - 9 sessions COMPLETED (Days 1-4 fully, Day 5 morning)");
  console.log("[Seed] - 3 sessions SCHEDULED (Day 5 evening, Day 6 both)");
  console.log("[Seed] - ALL 300 volunteers marked present for 9 completed sessions");
  console.log("[Seed] - 0 exam attempts (exams not yet started)");
  console.log("[Seed] - 15 tents with gender-segregated allocation");
  console.log("[Seed] ==================================================");
  console.log("[Seed] TO DEMONSTRATE THE SYSTEM:");
  console.log("[Seed] 1. Login as Instructor -> Go to QR Generate -> Generate QR for Day 5 Evening");
  console.log("[Seed] 2. Login as Volunteer -> Go to Scanner -> Scan QR to mark attendance");
  console.log("[Seed] 3. Mark attendance for remaining volunteers via Roster page");
  console.log("[Seed] 4. Once Day 5 evening is completed, exams become available");
  console.log("[Seed] 5. Volunteers can take Pre-Test, then Post-Test");
  console.log("[Seed] 6. Upon passing, certificates are auto-generated");
  console.log("[Seed] ==================================================");

  await client.end();
}

seed().catch((err) => {
  console.error("[Seed] Error:", err);
  process.exit(1);
});
