# RAGBot – Retrieval-Augmented AI Chat Assistant

RAGBot is a lightweight, end-to-end **Retrieval-Augmented Generation (RAG)** chatbot that combines a custom-built **TF-IDF retriever** with **Google Gemini** to generate grounded, context-aware answers from your uploaded documents.

This project was built to understand how real-world AI systems retrieve information, construct prompts using relevant context, and generate accurate responses with minimal hallucination. RAGBot includes a clean UI, source citations, and a secure backend proxy to keep API keys safe.

-----------------------------------------------------------------------------------------------------------------------------

## 🚀 Features

### 🔍 Retrieval (TF-IDF Based)
- Custom implementation of:
  - text preprocessing  
  - tokenization  
  - TF-IDF vectorization  
  - cosine similarity  
- Retrieves top-k relevant documents
- Shows relevance percentage for transparency

### 🤖 Generation (Google Gemini)
- Retrieved documents are converted into a contextual prompt
- Prompt is forwarded to Gemini via backend proxy
- Model answers **only from your documents**
- Reduces hallucination and improves answer accuracy

### 📄 Document Store
- Upload `.txt` files or type directly
- View, search, and delete stored documents
- Clean preview interface with timestamps

### 💬 Modern Chat UI
- Real-time chat interface
- Assistant responses include:
  - grounded answer
  - relevant sources
  - confidence icons/status
- Smooth scrolling & responsive layout (Tailwind CSS)

### 🔐 Secure Backend (Node.js + Express)
- Protects your Gemini API key
- Performs dynamic model selection if needed
- Sanitizes inputs and handles errors gracefully

---

## 🛠️ Tech Stack

### Frontend
- **React.js**
- **Tailwind CSS**
- **Lucide Icons**
- Custom TF-IDF Engine (no external vector DB)

### Backend
- **Node.js**
- **Express.js**
- **Google Gemini API (via proxy)**
- **CORS + dotenv**
