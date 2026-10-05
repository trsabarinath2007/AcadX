const express = require("express");
const bcrypt = require("bcryptjs");
const XLSX = require("xlsx");

const User = require("../models/User");
const Department = require("../models/Department");
const Course = require("../models/Course");
const Attendance = require("../models/Attendance");
const AcademicRecord = require("../models/AcademicRecord");
const QuizAttempt = require("../models/QuizAttempt");

const { protect, roles } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| ADMIN PROTECTION
|--------------------------------------------------------------------------
| Every route in this file can only be accessed by an authenticated admin.
*/
router.use(protect, roles("admin"));

/*
|--------------------------------------------------------------------------
| ADMIN OVERVIEW
|--------------------------------------------------------------------------
*/

router.get("/overview", async (req, res) => {
  try {
    const [
      students,
      faculty,
      departments,
      courses,
      attendance,
      records,
      attempts
    ] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "faculty" }),
      Department.countDocuments(),
      Course.countDocuments(),
      Attendance.countDocuments(),
      AcademicRecord.find().select("gpa"),
      QuizAttempt.find().select("percentage")
    ]);

    const avg = (items, field) =>
      items.length
        ? items.reduce(
            (sum, item) => sum + Number(item[field] || 0),
            0
          ) / items.length
        : 0;

    res.json({
      students,
      faculty,
      departments,
      courses,
      averageGpa: Number(avg(records, "gpa").toFixed(2)),
      averageQuiz: Number(avg(attempts, "percentage").toFixed(1)),
      attendanceRecords: attendance
    });
  } catch (error) {
    console.error("Admin overview error:", error);

    res.status(500).json({
      message: "Failed to load admin overview",
      error: error.message
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET ALL STUDENTS
|--------------------------------------------------------------------------
*/

router.get("/students", async (req, res) => {
  try {
    const students = await User.find({ role: "student" })
      .populate("department", "name code")
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({ students });
  } catch (error) {
    console.error("Get students error:", error);

    res.status(500).json({
      message: "Failed to load students",
      error: error.message
    });
  }
});

/*
|--------------------------------------------------------------------------
| MANUALLY CREATE STUDENT
|--------------------------------------------------------------------------
| Secondary method.
|--------------------------------------------------------------------------
*/

router.post("/students", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      registerNumber,
      department,
      semester,
      section
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !registerNumber ||
      !department ||
      !semester ||
      !section
    ) {
      return res.status(400).json({
        message: "All student details are required"
      });
    }

    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { registerNumber }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email or register number already exists"
      });
    }

    const student = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      registerNumber: registerNumber.trim(),
      department,
      semester,
      section: section.trim(),
      role: "student"
    });

    const createdStudent = await User.findById(student._id)
      .populate("department", "name code")
      .select("-password");

    res.status(201).json({
      student: createdStudent
    });
  } catch (error) {
    console.error("Create student error:", error);

    res.status(500).json({
      message: "Failed to create student",
      error: error.message
    });
  }
});

/*
|--------------------------------------------------------------------------
| IMPORT STUDENTS FROM EXCEL
|--------------------------------------------------------------------------
|
| Excel columns:
|
| Student Name
| Register No
| Student Mail ID
| Semester
| Department
| Section
|
| Initial password:
| student123
|
|--------------------------------------------------------------------------
*/

router.post(
  "/students/import",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Excel file is required"
        });
      }

      const workbook = XLSX.read(req.file.buffer, {
        type: "buffer"
      });

      if (!workbook.SheetNames.length) {
        return res.status(400).json({
          message: "Excel file contains no sheets"
        });
      }

      const sheet =
        workbook.Sheets[workbook.SheetNames[0]];

      const rows = XLSX.utils.sheet_to_json(sheet);

      if (!rows.length) {
        return res.status(400).json({
          message: "Excel file contains no student records"
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Normalize Excel column names
      |--------------------------------------------------------------------------
      */

      const normalize = (row, names) => {
        const key = Object.keys(row).find((key) =>
          names.includes(key.toLowerCase().trim())
        );

        return key
          ? String(row[key]).trim()
          : "";
      };

      const created = [];
      const errors = [];

      /*
      |--------------------------------------------------------------------------
      | FIXED INITIAL PASSWORD
      |--------------------------------------------------------------------------
      */

      const initialPassword = "student123";

      /*
      |--------------------------------------------------------------------------
      | PROCESS EACH ROW
      |--------------------------------------------------------------------------
      */

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];

        try {
          const name = normalize(row, [
            "student name",
            "name"
          ]);

          const email = normalize(row, [
            "student mail id",
            "student email",
            "email",
            "email id"
          ]).toLowerCase();

          const registerNumber = normalize(row, [
            "register number",
            "register no",
            "reg no"
          ]);

          const semesterValue = normalize(row, [
            "semester"
          ]);

          const semester = semesterValue
            ? Number(semesterValue)
            : undefined;

          const section = normalize(row, [
            "section"
          ]);

          const departmentValue = normalize(row, [
            "department",
            "department code"
          ]);

          /*
          |--------------------------------------------------------------------------
          | VALIDATION
          |--------------------------------------------------------------------------
          */

          if (!name) {
            throw new Error(
              "Student name is required"
            );
          }

          if (!email) {
            throw new Error(
              "Student email is required"
            );
          }

          if (!registerNumber) {
            throw new Error(
              "Register number is required"
            );
          }

          if (
            !semester ||
            semester < 1 ||
            semester > 10
          ) {
            throw new Error(
              "Valid semester is required"
            );
          }

          if (!section) {
            throw new Error(
              "Section is required"
            );
          }

          if (!departmentValue) {
            throw new Error(
              "Department is required"
            );
          }

          /*
          |--------------------------------------------------------------------------
          | FIND DEPARTMENT
          |--------------------------------------------------------------------------
          */

          const department =
            await Department.findOne({
              $or: [
                {
                  code: departmentValue.toUpperCase()
                },
                {
                  name: departmentValue
                }
              ]
            });

          if (!department) {
            throw new Error(
              `Department '${departmentValue}' not found`
            );
          }

          /*
          |--------------------------------------------------------------------------
          | CHECK DUPLICATES
          |--------------------------------------------------------------------------
          */

          const existingUser =
            await User.findOne({
              $or: [
                { email },
                { registerNumber }
              ]
            });

          if (existingUser) {
            throw new Error(
              "Email or register number already exists"
            );
          }

          /*
          |--------------------------------------------------------------------------
          | CREATE STUDENT
          |--------------------------------------------------------------------------
          */

          const student =
            await User.create({
              name,
              email,
              password: initialPassword,
              registerNumber,
              semester,
              section,
              department: department._id,
              role: "student",
              mustChangePassword: true
            });

          created.push({
            id: student._id,
            name: student.name,
            email: student.email,
            registerNumber:
              student.registerNumber,
            department:
              department.code,
            semester,
            section
          });
        } catch (error) {
          errors.push({
            rowNumber: index + 2,
            row,
            message: error.message
          });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

      res.json({
        message: `Imported ${created.length} students`,
        createdCount: created.length,
        errorCount: errors.length,
        created,
        errors
      });
    } catch (error) {
      console.error(
        "Student Excel import error:",
        error
      );

      res.status(500).json({
        message: "Failed to import students",
        error: error.message
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET ALL FACULTY
|--------------------------------------------------------------------------
*/

router.get("/faculty", async (req, res) => {
  try {
    const faculty = await User.find({
      role: "faculty"
    })
      .populate("department", "name code")
      .populate("facultyCourses", "code name")
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({ faculty });
  } catch (error) {
    console.error("Get faculty error:", error);

    res.status(500).json({
      message: "Failed to load faculty",
      error: error.message
    });
  }
});

/*
|--------------------------------------------------------------------------
| MANUALLY CREATE FACULTY
|--------------------------------------------------------------------------
| Secondary method.
|--------------------------------------------------------------------------
*/

router.post("/faculty", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      department
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      !department
    ) {
      return res.status(400).json({
        message: "All faculty details are required"
      });
    }

    const existingUser =
      await User.findOne({
        email: email.toLowerCase()
      });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already exists"
      });
    }

    const faculty = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      department,
      role: "faculty"
    });

    const createdFaculty =
      await User.findById(faculty._id)
        .populate("department", "name code")
        .select("-password");

    res.status(201).json({
      faculty: createdFaculty
    });
  } catch (error) {
    console.error(
      "Create faculty error:",
      error
    );

    res.status(500).json({
      message: "Failed to create faculty",
      error: error.message
    });
  }
});

/*
|--------------------------------------------------------------------------
| IMPORT FACULTY FROM EXCEL
|--------------------------------------------------------------------------
|
| Excel columns:
|
| Faculty Name
| Faculty ID
| Faculty Mail ID
| Department
| Specialisation
| Assigned Class
|
| Initial password:
| faculty123
|
|--------------------------------------------------------------------------
*/

router.post(
  "/faculty/import",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Excel file is required"
        });
      }

      const workbook = XLSX.read(
        req.file.buffer,
        {
          type: "buffer"
        }
      );

      if (!workbook.SheetNames.length) {
        return res.status(400).json({
          message: "Excel file contains no sheets"
        });
      }

      const sheet =
        workbook.Sheets[
          workbook.SheetNames[0]
        ];

      const rows =
        XLSX.utils.sheet_to_json(sheet);

      if (!rows.length) {
        return res.status(400).json({
          message:
            "Excel file contains no faculty records"
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Normalize Excel column names
      |--------------------------------------------------------------------------
      */

      const normalize = (row, names) => {
        const key = Object.keys(row).find(
          (key) =>
            names.includes(
              key.toLowerCase().trim()
            )
        );

        return key
          ? String(row[key]).trim()
          : "";
      };

      const created = [];
      const errors = [];

      /*
      |--------------------------------------------------------------------------
      | FIXED INITIAL PASSWORD
      |--------------------------------------------------------------------------
      */

      const initialPassword = "faculty123";

      /*
      |--------------------------------------------------------------------------
      | PROCESS FACULTY ROWS
      |--------------------------------------------------------------------------
      */

      for (
        let index = 0;
        index < rows.length;
        index++
      ) {
        const row = rows[index];

        try {
          const name = normalize(row, [
            "faculty name",
            "name"
          ]);

          const facultyId = normalize(row, [
            "faculty id",
            "faculty code"
          ]);

          const email = normalize(row, [
            "faculty mail id",
            "faculty email",
            "email",
            "email id"
          ]).toLowerCase();

          const departmentValue =
            normalize(row, [
              "department",
              "department code"
            ]);

          const specialisation =
            normalize(row, [
              "specialisation",
              "specialization"
            ]);

          const assignedClass =
            normalize(row, [
              "assigned class",
              "class"
            ]);

          /*
          |--------------------------------------------------------------------------
          | VALIDATION
          |--------------------------------------------------------------------------
          */

          if (!name) {
            throw new Error(
              "Faculty name is required"
            );
          }

          if (!facultyId) {
            throw new Error(
              "Faculty ID is required"
            );
          }

          if (!email) {
            throw new Error(
              "Faculty email is required"
            );
          }

          if (!departmentValue) {
            throw new Error(
              "Department is required"
            );
          }

          /*
          |--------------------------------------------------------------------------
          | FIND DEPARTMENT
          |--------------------------------------------------------------------------
          */

          const department =
            await Department.findOne({
              $or: [
                {
                  code:
                    departmentValue.toUpperCase()
                },
                {
                  name: departmentValue
                }
              ]
            });

          if (!department) {
            throw new Error(
              `Department '${departmentValue}' not found`
            );
          }

          /*
          |--------------------------------------------------------------------------
          | DUPLICATE EMAIL
          |--------------------------------------------------------------------------
          */

          const existingEmail =
            await User.findOne({
              email
            });

          if (existingEmail) {
            throw new Error(
              "Faculty email already exists"
            );
          }

          /*
          |--------------------------------------------------------------------------
          | FACULTY ID
          |--------------------------------------------------------------------------
          |
          | Your current User model does not yet have
          | a facultyId field.
          |
          | For now we use registerNumber to store
          | the faculty ID.
          |
          |--------------------------------------------------------------------------
          */

          const existingFacultyId =
            await User.findOne({
              registerNumber: facultyId
            });

          if (existingFacultyId) {
            throw new Error(
              "Faculty ID already exists"
            );
          }

          /*
          |--------------------------------------------------------------------------
          | CREATE FACULTY
          |--------------------------------------------------------------------------
          */

          const faculty =
            await User.create({
              name,
              email,
              password: initialPassword,

              registerNumber: facultyId,

              department:
                department._id,

              role: "faculty",

              mustChangePassword: true
            });

          created.push({
            id: faculty._id,
            name: faculty.name,
            email: faculty.email,
            facultyId,
            department:
              department.code,
            specialisation,
            assignedClass
          });
        } catch (error) {
          errors.push({
            rowNumber: index + 2,
            row,
            message: error.message
          });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

      res.json({
        message: `Imported ${created.length} faculty`,
        createdCount: created.length,
        errorCount: errors.length,
        created,
        errors
      });
    } catch (error) {
      console.error(
        "Faculty Excel import error:",
        error
      );

      res.status(500).json({
        message: "Failed to import faculty",
        error: error.message
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| ENABLE / DISABLE USER
|--------------------------------------------------------------------------
*/

router.patch(
  "/users/:id/status",
  async (req, res) => {
    try {
      const user =
        await User.findByIdAndUpdate(
          req.params.id,
          {
            active: Boolean(
              req.body.active
            )
          },
          {
            new: true
          }
        )
          .populate(
            "department",
            "name code"
          )
          .select("-password");

      if (!user) {
        return res.status(404).json({
          message: "User not found"
        });
      }

      res.json({ user });
    } catch (error) {
      console.error(
        "Update user status error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update user status",
        error: error.message
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET DEPARTMENTS
|--------------------------------------------------------------------------
*/

router.get("/departments", async (req, res) => {
  try {
    const departments =
      await Department.find().sort({
        name: 1
      });

    res.json({ departments });
  } catch (error) {
    console.error(
      "Get departments error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to load departments",
      error: error.message
    });
  }
});

/*
|--------------------------------------------------------------------------
| CREATE DEPARTMENT
|--------------------------------------------------------------------------
*/

router.post("/departments", async (req, res) => {
  try {
    const {
      name,
      code
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        message:
          "Department name and code are required"
      });
    }

    const department =
      await Department.create({
        name: name.trim(),
        code: code.trim().toUpperCase()
      });

    res.status(201).json({
      department
    });
  } catch (error) {
    console.error(
      "Create department error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to create department",
      error: error.message
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET COURSES
|--------------------------------------------------------------------------
*/

router.get("/courses", async (req, res) => {
  try {
    const courses =
      await Course.find()
        .populate(
          "department",
          "name code"
        )
        .populate(
          "faculty",
          "name email"
        )
        .sort({
          semester: 1,
          code: 1
        });

    res.json({ courses });
  } catch (error) {
    console.error(
      "Get courses error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to load courses",
      error: error.message
    });
  }
});

/*
|--------------------------------------------------------------------------
| CREATE COURSE
|--------------------------------------------------------------------------
*/

router.post("/courses", async (req, res) => {
  try {
    const course =
      await Course.create(req.body);

    res.status(201).json({
      course
    });
  } catch (error) {
    console.error(
      "Create course error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to create course",
      error: error.message
    });
  }
});

/*
|--------------------------------------------------------------------------
| ASSIGN FACULTY TO COURSE
|--------------------------------------------------------------------------
*/

router.patch(
  "/courses/:id/assign-faculty",
  async (req, res) => {
    try {
      const { facultyId } =
        req.body;

      const course =
        await Course.findByIdAndUpdate(
          req.params.id,
          {
            faculty: facultyId
          },
          {
            new: true
          }
        );

      if (!course) {
        return res.status(404).json({
          message: "Course not found"
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Add course to facultyCourses
      |--------------------------------------------------------------------------
      */

      if (facultyId) {
        await User.findByIdAndUpdate(
          facultyId,
          {
            $addToSet: {
              facultyCourses:
                course._id
            }
          }
        );
      }

      const populatedCourse =
        await Course.findById(
          course._id
        )
          .populate(
            "department",
            "name code"
          )
          .populate(
            "faculty",
            "name email"
          );

      res.json({
        course: populatedCourse
      });
    } catch (error) {
      console.error(
        "Assign faculty error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to assign faculty",
        error: error.message
      });
    }
  }
);

module.exports = router;