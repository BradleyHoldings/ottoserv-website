"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const INITIAL_MESSAGE: Message = {
  id: "0",
  role: "assistant",
  content:
    "Hi! I'm Jarvis, your AI business assistant. I can help you with project status, financial insights, task management, and more. What would you like to know today?",
  timestamp: new Date(),
};

const SUGGESTED_PROMPTS = [
  "What are my most urgent tasks today?",
  "How is Johnson Kitchen tracking vs budget?",
  "Which leads need follow-up?",
  "What's my revenue this month?",
  "Any projects at risk?",
];

const PLATFORM_URL = "https://platform.ottoserv.com";

const FALLBACK_RESPONSES = [
  "Based on your current projects, Johnson Kitchen is 6 days behind schedule. I recommend scheduling a client update call and reviewing the material delivery timeline.",
  "Your revenue this month is $47,500 with $12,800 still outstanding. There are 2 overdue invoices totaling $8,400 — I recommend sending payment reminders today.",
  "You have 4 overdue tasks today. The most urgent is 'Send final invoice to Tom Carter' which is 5 days overdue. Would you like me to draft the invoice?",
  "Based on your pipeline, you have 3 leads that need immediate follow-up. Sarah Mitchell has the highest lead score at 85 and has been waiting 2 days.",
  "Your gross margin this month is 38%, which is above your 35% target. Materials costs for PRJ-002 are running 18% over budget — keep an eye on that project.",
  "You have 3 appointments scheduled this week. Derek Walsh's estimate walkthrough is tomorrow at 2pm and hasn't been confirmed yet.",
];

export default function JarvisChat() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    let reply = FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];

    const platformToken = typeof window !== "undefined"
      ? localStorage.getItem("ottoserv_platform_token")
      : null;

    if (platformToken) {
      try {
        const res = await fetch(`${PLATFORM_URL}/jarvis/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${platformToken}`,
          },
          body: JSON.stringify({ message: text.trim() }),
          signal: AbortSignal.timeout(95000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.response) reply = data.response;
        }
      } catch { /* fall through to fallback */ }
    }

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: reply,
      timestamp: new Date(),
    };
    setMessages((m) => [...m, aiMsg]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-600/30 flex items-center justify-center text-base mr-3 flex-shrink-0 mt-0.5">
                🤖
              </div>
            )}
            <div
              className={`max-w-lg px-4 py-3 rounded-xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-[#111827] border border-gray-800 text-gray-200"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-600/30 flex items-center justify-center text-base mr-3 flex-shrink-0">
              🤖
            </div>
            <div className="bg-[#111827] border border-gray-800 rounded-xl px-4 py-3">
              <div className="flex gap-1 items-center">
                <span
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts (only show when few messages) */}
      {messages.length <= 2 && (
        <div className="flex flex-wrap gap-2 pb-3">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              className="text-xs px-3 py-1.5 bg-[#1f2937] hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-full transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-3 pt-3 border-t border-gray-800">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          placeholder="Ask Jarvis anything about your business..."
          className="flex-1 bg-[#1f2937] border border-gray-700 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-500 placeholder:text-gray-500"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-medium transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
