const express = require("express");
const { protect } = require("../middleware/auth");
const { askOllama } = require("../services/ai");

const router = express.Router();

/*
==================================================
COMMON AI HELPER
==================================================
*/

async function generateAIResponse(message, context = "") {
  const prompt = `
You are AcadX AI, an intelligent academic assistant inside a college
management platform.

Your job is to help students and faculty with:
- Academic concepts
- Programming
- Data Structures and Algorithms
- Exam preparation
- Study plans
- Assignments
- Quizzes
- Career guidance
- Project guidance
- General academic questions

Rules:
1. Explain concepts clearly and simply.
2. Give examples when useful.
3. For programming questions, explain the approach before the code.
4. Do not claim access to college/private data unless that data is explicitly
   provided in the prompt.
5. Do not invent student marks, attendance, courses, or institutional data.
6. If information is missing, clearly say that it is not available.
7. Keep responses useful and structured.
8. Use headings, bullets, and code blocks when appropriate.

${context ? `Additional context:\n${context}\n` : ""}

User message:
${message}
`;

  return await askOllama(prompt);
}

/*
==================================================
GENERAL ACADX CHAT
POST /api/ai/chat
==================================================
*/

router.post("/chat", protect, async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        message: "Message is required"
      });
    }

    const response = await generateAIResponse(
      message,
      context || ""
    );

    return res.json({
      response
    });
  } catch (error) {
    console.error("AI Chat Error:", error);

    return res.status(500).json({
      message: "Failed to generate AI response"
    });
  }
});

/*
==================================================
STUDY ASSISTANT
POST /api/ai/study
==================================================
*/

router.post("/study", protect, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        message: "Message is required"
      });
    }

    const context = `
You are specifically acting as AcadX Study Assistant.

Focus on:
- Understanding academic concepts
- Step-by-step explanations
- Exam preparation
- Revision
- Practice questions
- Study plans
- Programming and DSA learning
`;

    const response = await generateAIResponse(
      message,
      context
    );

    return res.json({
      response
    });
  } catch (error) {
    console.error("Study Assistant Error:", error);

    return res.status(500).json({
      message: "Failed to generate study response"
    });
  }
});

/*
==================================================
AI ANALYSIS
POST /api/ai/analyze
==================================================
*/

router.post("/analyze", protect, async (req, res) => {
  try {
    const { message, data } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        message: "Analysis request is required"
      });
    }

    const context = `
You are AcadX Academic Analysis AI.

Analyze ONLY the academic data supplied below.

Academic data:
${JSON.stringify(data || {}, null, 2)}

The user is asking:
${message}

Do not invent missing values.
Clearly distinguish observations from recommendations.
`;

    const response = await askOllama(context);

    return res.json({
      response
    });
  } catch (error) {
    console.error("AI Analysis Error:", error);

    return res.status(500).json({
      message: "Failed to generate analysis"
    });
  }
});

/*
==================================================
ADMIN AI
POST /api/ai/admin
==================================================
*/

router.post("/admin", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required"
      });
    }

    const { question, data } = req.body;

    if (!question?.trim()) {
      return res.status(400).json({
        message: "Question is required"
      });
    }

    const prompt = `
You are AcadX Admin AI.

Help the administrator understand institutional
academic information and make useful decisions.

User question:
${question}

Available institutional data:
${JSON.stringify(data || {}, null, 2)}

Rules:
- Do not invent institutional statistics.
- Do not invent students or faculty.
- If data is unavailable, say so.
- Provide practical recommendations when appropriate.
`;

    const response = await askOllama(prompt);

    return res.json({
      response
    });
  } catch (error) {
    console.error("Admin AI Error:", error);

    return res.status(500).json({
      message: "Failed to generate admin AI response"
    });
  }
});

module.exports = router;