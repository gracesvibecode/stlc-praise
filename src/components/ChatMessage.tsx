"use client";

interface ChatMessageProps {
  role: "user" | "assistant";
  children: React.ReactNode;
}

export default function ChatMessage({ role, children }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-primary text-white rounded-br-md"
            : "bg-bg-chat-ai border border-border text-text rounded-bl-md"
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
            <span className="text-xs font-medium text-primary">선곡 도우미</span>
          </div>
        )}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{children}</div>
      </div>
    </div>
  );
}
