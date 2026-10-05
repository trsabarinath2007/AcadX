require("dotenv").config();

const connectDB = require("./config/db");

const User = require("./models/User");
const Department = require("./models/Department");
const Course = require("./models/Course");
const Assignment = require("./models/Assignment");
const Quiz = require("./models/Quiz");
const Announcement = require("./models/Announcement");
const Attendance = require("./models/Attendance");
const AcademicRecord = require("./models/AcademicRecord");

async function seed() {
  await connectDB();

  /*
   * ============================================================
   * CLEAR EXISTING DEMO DATA
   * ============================================================
   */

  await Promise.all([
    User.deleteMany({}),
    Department.deleteMany({}),
    Course.deleteMany({}),
    Assignment.deleteMany({}),
    Quiz.deleteMany({}),
    Announcement.deleteMany({}),
    Attendance.deleteMany({}),
    AcademicRecord.deleteMany({})
  ]);

  /*
   * ============================================================
   * DEPARTMENTS
   * ============================================================
   */

  const cs = await Department.create({
    name: "Computer Science & Engineering",
    code: "CSE"
  });

  const it = await Department.create({
    name: "Information Technology",
    code: "IT"
  });

  /*
   * ============================================================
   * ADMIN
   * ============================================================
   */

  const admin = await User.create({
    name: "AcadX Administrator",
    email: "admin@acadx.edu",
    password: "Admin@123",
    role: "admin"
  });

  /*
   * ============================================================
   * FACULTY
   * ============================================================
   */

  const faculty = await User.create({
    name: "Prof. Marcus Brody",
    email: "faculty@acadx.edu",
    password: "Faculty@123",
    role: "faculty",
    department: cs._id
  });

  /*
   * ============================================================
   * STUDENT
   * ============================================================
   */

  const student = await User.create({
    name: "Alex Chen",
    email: "student@acadx.edu",
    password: "Student@123",
    role: "student",
    registerNumber: "CS-2024-042",
    department: cs._id,
    semester: 5,
    section: "A"
  });

  /*
   * ============================================================
   * COURSES
   * ============================================================
   */

  const courses = await Course.insertMany([
    {
      code: "CS501",
      name: "Data Structures and Algorithms",
      department: cs._id,
      semester: 5,
      sections: ["A", "B"],
      credits: 4,
      faculty: faculty._id
    },
    {
      code: "CS502",
      name: "Database Management Systems",
      department: cs._id,
      semester: 5,
      sections: ["A", "B"],
      credits: 4,
      faculty: faculty._id
    },
    {
      code: "CS503",
      name: "Operating Systems",
      department: cs._id,
      semester: 5,
      sections: ["A", "B"],
      credits: 4
    },
    {
      code: "CS504",
      name: "Computer Networks",
      department: cs._id,
      semester: 5,
      sections: ["A", "B"],
      credits: 3
    },
    {
      code: "CS505",
      name: "Advanced Software Engineering",
      department: cs._id,
      semester: 5,
      sections: ["A", "B"],
      credits: 3
    },
    {
      code: "IT501",
      name: "Web Technologies",
      department: it._id,
      semester: 5,
      sections: ["A"],
      credits: 3
    }
  ]);

  /*
   * ============================================================
   * ASSIGN COURSES TO FACULTY
   * ============================================================
   */

  faculty.facultyCourses = [
    courses[0]._id,
    courses[1]._id
  ];

  await faculty.save();

  /*
   * ============================================================
   * ASSIGNMENTS
   * ============================================================
   */

  await Assignment.create([
    {
      title: "Binary Search Tree Implementation",
      description:
        "Implement insertion, search and traversal for a binary search tree.",
      course: courses[0]._id,
      dueDate: new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ),
      totalMarks: 20,
      instructions:
        "Submit your Java source code and explanation.",
      createdBy: faculty._id
    },
    {
      title: "SQL Subqueries Practice",
      description:
        "Solve the supplied SQL subquery exercises.",
      course: courses[1]._id,
      dueDate: new Date(
        Date.now() + 4 * 24 * 60 * 60 * 1000
      ),
      totalMarks: 25,
      createdBy: faculty._id
    }
  ]);

  /*
   * ============================================================
   * QUIZ
   * ============================================================
   */

  await Quiz.create({
    title: "Database Systems Quiz 1",
    course: courses[1]._id,
    topic: "Relational Algebra and SQL",
    difficulty: "Medium",
    durationMinutes: 20,
    createdBy: faculty._id,

    questions: [
      {
        question:
          "Which operation combines rows from two relations based on a condition?",
        options: [
          "Selection",
          "Join",
          "Projection",
          "Rename"
        ],
        correctAnswer: "Join",
        marks: 1
      },
      {
        question:
          "Which SQL clause filters groups after aggregation?",
        options: [
          "WHERE",
          "ORDER BY",
          "HAVING",
          "FROM"
        ],
        correctAnswer: "HAVING",
        marks: 1
      }
    ]
  });

  /*
   * ============================================================
   * ACADEMIC RECORDS
   * ============================================================
   */

  await AcademicRecord.insertMany([
    {
      student: student._id,
      course: courses[0]._id,
      semester: 5,
      internalMarks: 45,
      externalMarks: 42,
      totalMarks: 87,
      grade: "A+",
      gpa: 9
    },
    {
      student: student._id,
      course: courses[1]._id,
      semester: 5,
      internalMarks: 44,
      externalMarks: 41,
      totalMarks: 85,
      grade: "A+",
      gpa: 9
    },
    {
      student: student._id,
      course: courses[2]._id,
      semester: 5,
      internalMarks: 40,
      externalMarks: 37,
      totalMarks: 77,
      grade: "B+",
      gpa: 8
    },
    {
      student: student._id,
      course: courses[3]._id,
      semester: 5,
      internalMarks: 43,
      externalMarks: 40,
      totalMarks: 83,
      grade: "A",
      gpa: 8.5
    }
  ]);

  /*
   * ============================================================
   * ATTENDANCE
   *
   * IMPORTANT:
   * Attendance now requires `section`.
   * ============================================================
   */

  const attendanceDocs = [];

  for (const course of courses.slice(0, 4)) {
    for (let i = 0; i < 10; i++) {
      attendanceDocs.push({
        course: course._id,
        student: student._id,

        // FIX:
        // Attendance schema now requires section.
        section: student.section,

        date: new Date(
          Date.now() - i * 86400000
        ),

        status:
          i === 4 && course.code === "CS503"
            ? "absent"
            : "present",

        markedBy: faculty._id
      });
    }
  }

  await Attendance.insertMany(attendanceDocs);

  /*
   * ============================================================
   * ANNOUNCEMENTS
   * ============================================================
   */

  await Announcement.create([
    {
      title: "Unit 4 Graph Algorithms Lecture Slides",
      body: "Updated lecture material is now available.",
      audience: "students",
      createdBy: faculty._id
    },
    {
      title: "Internal Assessment Schedule",
      body:
        "The latest internal assessment schedule has been published.",
      audience: "all",
      createdBy: admin._id
    }
  ]);

  /*
   * ============================================================
   * SUCCESS
   * ============================================================
   */

  console.log("\n==========================================");
  console.log("      AcadX demo data created");
  console.log("==========================================");

  console.log("\nAdmin:");
  console.log("Email    : admin@acadx.edu");
  console.log("Password : Admin@123");

  console.log("\nFaculty:");
  console.log("Email    : faculty@acadx.edu");
  console.log("Password : Faculty@123");

  console.log("\nStudent:");
  console.log("Email    : student@acadx.edu");
  console.log("Password : Student@123");

  console.log("\n==========================================\n");

  process.exit(0);
}

seed().catch((error) => {
  console.error("\nSeed failed:");
  console.error(error);
  process.exit(1);
});