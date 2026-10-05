const axios = require("axios");

/*
==================================================
OLLAMA AI SERVICE
==================================================
*/

async function askOllama(prompt) {
  const base =
    process.env.OLLAMA_BASE_URL || "http://localhost:11434";

  const model =
    process.env.OLLAMA_MODEL || "gemma4:latest";

  console.log("\n=================================");
  console.log("🤖 AcadX AI Request");
  console.log("Model:", model);
  console.log("Ollama:", base);
  console.log("=================================");

  const startTime = Date.now();

  try {
    const response = await axios.post(
      `${base}/api/generate`,
      {
        model,
        prompt,
        stream: false,

        options: {
          temperature: 0.3,
          num_predict: 500,
        },
      },
      {
        timeout: 120000,
      }
    );

    const elapsed = Date.now() - startTime;

    console.log(`✅ Ollama responded in ${elapsed} ms`);

    return (
      response.data?.response ||
      "No AI response was returned."
    );
  } catch (error) {
    const elapsed = Date.now() - startTime;

    console.error(
      `❌ Ollama failed after ${elapsed} ms`
    );

    console.error("Message:", error.message);

    if (error.response) {
      console.error(
        "Status:",
        error.response.status
      );

      console.error(
        "Data:",
        error.response.data
      );
    }

    return (
      "AI service is currently unavailable. " +
      "Please make sure Ollama is running and the configured model is installed."
    );
  }
}


/*
==================================================
COMMON ACADX AI HELPER
==================================================
*/

async function generateAIResponse(
  message,
  context = ""
) {
  const prompt = `
You are AcadX AI, an intelligent academic assistant
inside a college management platform.

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

RULES:

1. Explain concepts clearly and simply.
2. Give examples when useful.
3. For programming questions, explain the approach before the code.
4. Do not claim access to college/private data unless that data is explicitly provided.
5. Do not invent student marks, attendance, courses, or institutional data.
6. If information is missing, clearly say that it is not available.
7. Keep responses useful and structured.
8. Use headings, bullets, and code blocks when appropriate.
9. For DSA questions, explain the intuition and time/space complexity.
10. Help students learn instead of blindly giving answers.
11. If the student asks for code, explain the logic before presenting the code.
12. Keep the response focused on the student's question.

${context ? `
Additional context:
${context}
` : ""}

User message:
${message}
`;

  return await askOllama(prompt);
}


module.exports = {
  askOllama,
  generateAIResponse,
};