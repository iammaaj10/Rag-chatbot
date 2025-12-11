import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Upload,
  Database,
  Bot,
  FileText,
  Trash2,
  Search,
  CheckCircle,
  AlertCircle,
  Menu,
  X
} from "lucide-react";

/* ------------------------
   Configuration
   ------------------------ */
const BACKEND_URL = "http://localhost:3001/api/chat";

/* =========================
   Text processing & TF-IDF
   ========================= */

const preprocessText = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const tokenize = (text) => {
  if (!text) return [];
  return preprocessText(text)
    .split(" ")
    .filter((word) => word.length > 2);
};

const calculateTFIDF = (documents) => {
  const docCount = documents.length || 1;
  const termDocFreq = {};

  documents.forEach((doc) => {
    const uniqueTerms = new Set(tokenize(doc.content || ""));
    uniqueTerms.forEach((term) => {
      termDocFreq[term] = (termDocFreq[term] || 0) + 1;
    });
  });

  return documents.map((doc) => {
    const terms = tokenize(doc.content || "");
    const termFreq = {};
    terms.forEach((term) => {
      termFreq[term] = (termFreq[term] || 0) + 1;
    });

    const tfidf = {};
    Object.keys(termFreq).forEach((term) => {
      const tf = termFreq[term] / Math.max(1, terms.length);
      const idf = Math.log(docCount / (termDocFreq[term] || 1));
      tfidf[term] = tf * idf;
    });

    return { ...doc, tfidf };
  });
};

/* =========================
   RetrievalEngine
   ========================= */

class RetrievalEngine {
  constructor(documents) {
    this.documents = calculateTFIDF(documents || []);
  }

  cosineSimilarity(vec1, vec2) {
    const terms = new Set([
      ...Object.keys(vec1 || {}),
      ...Object.keys(vec2 || {}),
    ]);
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    terms.forEach((term) => {
      const v1 = vec1[term] || 0;
      const v2 = vec2[term] || 0;
      dotProduct += v1 * v2;
      mag1 += v1 * v1;
      mag2 += v2 * v2;
    });

    const denom = Math.sqrt(mag1) * Math.sqrt(mag2);
    return denom === 0 ? 0 : dotProduct / denom;
  }

  retrieve(query, topK = 3) {
    if (!query || !query.trim()) return [];
    const queryTerms = tokenize(query);
    if (queryTerms.length === 0) return [];

    const queryVec = {};
    queryTerms.forEach((term) => {
      queryVec[term] = (queryVec[term] || 0) + 1;
    });

    const normalizedResults = this.documents
      .map((doc) => ({
        ...doc,
        score: this.cosineSimilarity(queryVec, doc.tfidf || {}),
      }))
      .filter((d) => d.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return normalizedResults;
  }
}

/* =========================
   DocumentManager Component
   ========================= */

const DocumentManager = ({ documents, onAddDocument, onDeleteDocument, isMobile, isOpen, onClose }) => {
  const [newDocContent, setNewDocContent] = useState("");
  const [newDocTitle, setNewDocTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const fileInputRef = useRef(null);

  const handleAddDocument = () => {
    if (!newDocTitle.trim() || !newDocContent.trim()) return;
    onAddDocument({
      id: Date.now(),
      title: newDocTitle,
      content: newDocContent,
      timestamp: new Date().toISOString(),
    });
    setNewDocTitle("");
    setNewDocContent("");
    setIsAdding(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onAddDocument({
        id: Date.now(),
        title: file.name,
        content: ev.target.result,
        timestamp: new Date().toISOString(),
      });
    };
    reader.readAsText(file);
  };

  // On mobile, this renders as a slide-over or modal. On desktop, it's a static panel.
  const containerClasses = isMobile
    ? `fixed inset-0 z-50 bg-white transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} overflow-y-auto`
    : `bg-white rounded-lg shadow-lg flex flex-col h-full overflow-hidden`;

  return (
    <div className={containerClasses}>
      {isMobile && (
        <div className="p-4 flex justify-between items-center border-b bg-gray-50">
           <h2 className="text-xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-600" />
            Document Store
          </h2>
          <button onClick={onClose} className="p-2 bg-gray-200 rounded-full">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col min-h-0">
        {!isMobile && (
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Database className="w-6 h-6 text-blue-600" />
              Docs
            </h2>
            <div className="flex gap-2">
               <button
                onClick={() => fileInputRef.current.click()}
                className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center justify-center"
                title="Upload File"
              >
                <Upload className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center justify-center"
                title="Add Text"
              >
                {isAdding ? <X className="w-5 h-5" /> : <span className="text-xl font-bold leading-none">+</span>}
              </button>
            </div>
          </div>
        )}

        {/* Mobile controls inside the main area if mobile */}
        {isMobile && (
             <div className="flex gap-2 mb-4">
               <button
                onClick={() => fileInputRef.current.click()}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 font-medium"
              >
                <Upload className="w-5 h-5" /> Upload File
              </button>
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2 font-medium"
              >
                {isAdding ? 'Cancel' : 'Add Text'}
              </button>
            </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt"
          onChange={handleFileUpload}
          className="hidden"
        />

        {isAdding && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 flex-shrink-0">
            <input
              type="text"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              placeholder="Document title"
              className="w-full p-3 mb-2 border rounded-lg"
            />
            <textarea
              value={newDocContent}
              onChange={(e) => setNewDocContent(e.target.value)}
              placeholder="Document content..."
              className="w-full p-3 border rounded-lg resize-none"
              rows="4"
            />
            <button
              onClick={handleAddDocument}
              className="mt-2 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              Save Document
            </button>
          </div>
        )}

        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
          <div className="text-sm text-gray-600 mb-2 sticky top-0 bg-white py-1 z-10">
            Total Documents: {documents.length}
          </div>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-3 bg-gray-50 rounded border border-gray-200 hover:border-blue-300 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <h3 className="font-semibold text-sm truncate">{doc.title}</h3>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {doc.content}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(doc.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => onDeleteDocument(doc.id)}
                  className="p-2 ml-2 text-red-600 hover:bg-red-50 rounded-full"
                  title="Delete document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
           {documents.length === 0 && (
            <div className="text-center py-8 text-gray-400 italic text-sm">
                No documents yet. <br/> Upload or add one to start.
            </div>
           )}
        </div>
      </div>
    </div>
  );
};

/* =========================
   ChatInterface Component
   ========================= */

const ChatInterface = ({ messages, onSendMessage, isProcessing, onToggleSidebar, isMobile }) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isProcessing) return;
    onSendMessage(input);
    setInput("");
  };

  return (
    <div className="bg-white rounded-lg shadow-lg flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white z-10">
        <div className="flex items-center gap-2">
          {isMobile && (
            <button 
                onClick={onToggleSidebar}
                className="mr-2 p-2 -ml-2 hover:bg-gray-100 rounded-md"
            >
                <Menu className="w-6 h-6 text-gray-600" />
            </button>
          )}
          <Bot className="w-6 h-6 text-purple-600" />
          <h2 className="text-lg md:text-xl font-bold">
            Assistant
          </h2>
        </div>
        <div className="text-xs text-gray-500 hidden sm:block">
             Copyright &copy; 2025 Designed by <span className="text-black uppercase font-bold">maaj</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-12 px-4">
            <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold">Welcome to RAG Chatbot</p>
            <p className="text-sm mt-2">
                {isMobile ? "Tap the menu to add docs!" : "Add documents and start asking questions!"}
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[90%] md:max-w-3xl ${
                msg.role === "user" ? "bg-blue-600 text-white" : "bg-white border border-gray-200"
              } rounded-2xl px-4 py-3 shadow-sm`}
            >
              <div className="flex items-start gap-2">
                {msg.role === "assistant" && (
                  <Bot className="w-5 h-5 mt-1 text-purple-600 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p
                    className={`text-sm md:text-base ${
                      msg.role === "user" ? "text-white" : "text-gray-800"
                    }`}
                    style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    {msg.content}
                  </p>

                  {msg.retrievedDocs && msg.retrievedDocs.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-300/50">
                      <div className={`flex items-center gap-1 text-xs font-semibold mb-2 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                        <Search className="w-3 h-3" />
                        Sources ({msg.retrievedDocs.length})
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                        {msg.retrievedDocs.map((doc, i) => (
                            <div
                            key={i}
                            className={`flex-shrink-0 w-48 text-xs p-2 rounded border ${
                                msg.role === 'user' ? 'bg-blue-700 border-blue-500 text-blue-50' : 'bg-gray-50 border-gray-200 text-gray-600'
                            }`}
                            >
                            <div className="font-semibold truncate mb-1">
                                {doc.title}
                            </div>
                            <div className="line-clamp-2 text-[10px] opacity-80">
                                {doc.content}
                            </div>
                            </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.status && (
                    <div
                      className={`mt-2 text-xs flex items-center gap-1 ${
                        msg.status === "success"
                          ? (msg.role === 'user' ? "text-blue-200" : "text-green-600")
                          : (msg.role === 'user' ? "text-yellow-200" : "text-yellow-600")
                      }`}
                    >
                      {msg.status === "success" ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {msg.statusMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 md:p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask a question..."
            disabled={isProcessing}
            className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 text-sm md:text-base pl-4"
          />
          <button
            onClick={handleSend}
            disabled={isProcessing}
            className="bg-purple-600 text-white w-12 h-12 rounded-full hover:bg-purple-700 disabled:bg-gray-400 flex items-center justify-center flex-shrink-0 shadow-md transition-transform active:scale-95"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================
   Main App Component
   ========================= */

export default function RAGChatbotSystem() {
  const [documents, setDocuments] = useState(() => {
    const savedDocs = localStorage.getItem("rag_documents");
    if (savedDocs) {
      try {
        return JSON.parse(savedDocs);
      } catch (e) {
        console.error("Failed to parse documents from localStorage", e);
      }
    }
    return [
      {
        id: 1,
        title: "Introduction to Machine Learning",
        content:
          "Machine Learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.",
        timestamp: new Date().toISOString(),
      },
    ];
  });

  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Responsive State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
        setIsMobile(window.innerWidth < 1024);
        if (window.innerWidth >= 1024) {
            setIsSidebarOpen(false); // Reset sidebar state on desktop
        }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem("rag_documents", JSON.stringify(documents));
  }, [documents]);

  const handleAddDocument = (doc) => {
    setDocuments((prev) => [...prev, doc]);
    if (isMobile) setIsSidebarOpen(false); // Close sidebar after adding on mobile
  };

  const handleDeleteDocument = (id) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const handleSendMessage = async (query) => {
    if (!query || !query.trim()) return;

    if (documents.length === 0) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: query },
        {
          role: "assistant",
          content: "Please add some documents to the knowledge base first.",
          status: "error",
          statusMessage: "No documents available",
        },
      ]);
      return;
    }

    setIsProcessing(true);
    setMessages((prev) => [...prev, { role: "user", content: query }]);

    try {
      const retriever = new RetrievalEngine(documents);
      const retrievedDocs = retriever.retrieve(query, 3);

      if (!retrievedDocs || retrievedDocs.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I couldn't find any relevant documents for your question. Try rephrasing or adding more documents.",
            status: "warning",
            statusMessage: "No relevant documents found",
          },
        ]);
        setIsProcessing(false);
        return;
      }

      const context = retrievedDocs
        .map((doc) => `Document: ${doc.title}\nContent: ${doc.content}`)
        .join("\n\n---\n\n");

      const prompt = `You are a helpful assistant. Answer the user's question based ONLY on the following context. If the answer cannot be found in the context, say so.

Context:
${context}

Question: ${query}

Provide a clear, concise answer based on the context provided.`;

      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-1.5-flash",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();

      if (data.success && data.content) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.content,
            retrievedDocs: retrievedDocs,
            status: "success",
            statusMessage: `Retrieved ${retrievedDocs.length} relevant documents`,
          },
        ]);
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (error) {
      console.error("Frontend fetch error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an error processing your request. Please check your backend server console.",
          status: "error",
          statusMessage: error.message,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col md:p-6 p-0 overflow-hidden">
        {/* Mobile Overlay for Sidebar */}
        {isMobile && isSidebarOpen && (
            <div 
                className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                onClick={() => setIsSidebarOpen(false)}
            />
        )}

        <div className="max-w-7xl w-full mx-auto h-full flex flex-col lg:flex-row gap-6 relative">
          
          {/* Document Manager - Slide out on Mobile, Static on Desktop */}
          <div className={`${isMobile ? 'absolute inset-y-0 left-0 z-50 w-80' : 'w-1/3 min-w-[300px] h-full'} ${!isMobile && 'block'} ${isMobile && !isSidebarOpen && 'hidden'}`}>
             <DocumentManager
              documents={documents}
              onAddDocument={handleAddDocument}
              onDeleteDocument={handleDeleteDocument}
              isMobile={isMobile}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 h-full flex flex-col min-w-0">
             <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isProcessing={isProcessing}
              onToggleSidebar={() => setIsSidebarOpen(true)}
              isMobile={isMobile}
            />
          </div>
        </div>
    </div>
  );
}