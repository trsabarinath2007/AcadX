# AcadX — Academic Intelligence Platform

AcadX is a MERN-based institution-wide academic management and intelligence platform for Admin, Faculty and Student roles.

## Stack

- React + Vite
- Tailwind CSS
- React Router
- Axios
- Recharts
- Node.js + Express
- MongoDB + Mongoose
- JWT + bcrypt
- Multer
- XLSX
- Ollama + Gemma 3 4B

## Core capabilities

- Controlled authentication; no public student/faculty registration
- Admin-managed students and faculty
- Excel student import
- Departments, semesters, sections and courses
- Faculty course assignment
- Learning materials
- Assignments, submissions and grading
- Quizzes and attempts
- Attendance
- Academic records
- Academic intelligence and risk indicators
- Student AI analysis
- AI study assistant
- Faculty class insights
- AI quiz generator
- Discussion forum
- Notifications
- Responsive desktop/mobile UI
- Collapsible desktop sidebar and mobile drawer

## Setup

1. Extract the ZIP.
2. Open a terminal in the project root.
3. Create `server/.env` using `.env.example` as the template.
4. Add your MongoDB URI and JWT secret.
5. Install dependencies:

```bash
npm install
```

6. Seed demo data:

```bash
npm run seed
```

7. Start development:

```bash
npm run dev
```

- React: http://localhost:5173
- API: http://localhost:3000

For a production-style single server:

```bash
npm run build
npm start
```

Then open http://localhost:3000

## Demo credentials after seeding

Admin:
- Email: `admin@acadx.edu`
- Password: `Admin@123`

Faculty:
- Email: `faculty@acadx.edu`
- Password: `Faculty@123`

Student:
- Email: `student@acadx.edu`
- Password: `Student@123`

Change demo credentials before institutional deployment.

## Ollama

Install Ollama separately and make sure it is running locally. Pull the configured model:

```bash
ollama pull gemma3:4b
```

If Ollama is unavailable, the AI endpoints return a helpful fallback message rather than exposing AI configuration to the browser.

## Excel import

The admin student import accepts `.xlsx` or `.xls` files with these columns:

- Register Number
- Student Name
- Email
- Initial Password
- Semester
- Department
- Section

Column names are matched case-insensitively.

## Security notes

- Keep `server/.env` private.
- AI requests are made by the Express backend.
- Student/faculty accounts are created by admins.
- Backend role middleware protects administrative routes.
- Production deployments should use HTTPS and secure cookie settings.
