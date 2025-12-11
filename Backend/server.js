require('dotenv').config();
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173', methods: ['POST', 'GET'] }));
app.use(express.json());

// Check API Key
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is missing in .env file');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use the working model from your test: gemini-2.5-flash
const MODEL_NAME = "gemini-2.5-flash";

console.log(`🤖 Configured to use model: ${MODEL_NAME}`);

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No messages provided"
      });
    }
    
    console.log(`🤖 Processing request with model: ${MODEL_NAME}`);

    const generativeModel = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Get the last message (which contains the RAG context + query)
    const prompt = messages[messages.length - 1].content;

    // Generate response
    const result = await generativeModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log(`✅ Response generated successfully`);

    res.json({
      success: true,
      model: MODEL_NAME,
      content: text
    });

  } catch (error) {
    console.error("❌ Gemini API Error:", error.message);
    
    res.status(500).json({
      success: false,
      error: "Gemini Request Failed",
      details: error.message
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Server is running",
    model: MODEL_NAME
  });
});

// Endpoint to check current model
app.get("/api/model", (req, res) => {
  res.json({ 
    success: true, 
    currentModel: MODEL_NAME
  });
});

app.listen(PORT, () => {
  console.log(`
✅ Server running on: http://localhost:${PORT}
🤖 Model: ${MODEL_NAME}
📝 API Key: Loaded
🔗 Health check: http://localhost:${PORT}/health

Ready to accept requests!
  `);
});