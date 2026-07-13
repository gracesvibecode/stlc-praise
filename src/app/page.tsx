"use client";

import { useState, useRef, useEffect } from "react";
import WelcomeScreen from "@/components/WelcomeScreen";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import SongCard, { type Song } from "@/components/SongCard";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  songs?: Song[];
}

type AppState = "welcome" | "chat" | "confirmed";

function processChatResponse(
  data: { action: string; message: string; swapIndex?: number; newSong?: Omit<Song, "id">; newSongs?: Omit<Song, "id">[] },
  currentSongs: Song[],
  setSongs: (songs: Song[]) => void
): Message {
  if (data.action === "swap" && data.swapIndex != null && data.swapIndex >= 0 && data.newSong) {
    const newSongs = [...currentSongs];
    newSongs[data.swapIndex] = { id: crypto.randomUUID(), ...data.newSong } as Song;
    setSongs(newSongs);
    return { id: crypto.randomUUID(), role: "assistant", content: data.message, songs: newSongs };
  }

  if (data.action === "recommend" && data.newSongs?.length) {
    const recommended: Song[] = data.newSongs.map((s, i) => ({
      id: String(Date.now()) + i,
      ...s,
    } as Song));
    setSongs(recommended);
    return { id: crypto.randomUUID(), role: "assistant", content: data.message, songs: recommended };
  }

  return { id: crypto.randomUUID(), role: "assistant", content: data.message };
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>("welcome");
  const [messages, setMessages] = useState<Message[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [setlistId, setSetlistId] = useState<string | null>(null);
  const [initialPrompt, setInitialPrompt] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInitialSubmit = async (prompt: string, songCount: number) => {
    setIsLoading(true);
    setAppState("chat");

    setInitialPrompt(prompt);
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: `${prompt}\n\n추천곡 수: ${songCount}곡`,
    };
    setMessages([userMsg]);

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, songCount }),
      });

      if (!res.ok) throw new Error("추천 요청 실패");

      const data = await res.json();
      const recommended: Song[] = data.songs;
      setSongs(recommended);

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `말씀하신 조건에 맞춰 ${recommended.length}곡을 추천드립니다. 교체를 원하시면 곡 카드의 '교체' 버튼을 누르거나 채팅으로 요청해주세요.`,
        songs: recommended,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "죄송합니다. 추천 생성 중 오류가 발생했습니다. 다시 시도해주세요.",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwapRequest = async (index: number) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: `${index + 1}번 곡 "${songs[index].title}"을 다른 곡으로 교체해주세요.`,
    };
    setMessages((prev) => [...prev, msg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentSongs: songs.map((s) => ({ title: s.title, composer: s.composer })),
          message: `${index + 1}번 곡 "${songs[index].title}"을 다른 곡으로 교체해주세요.`,
        }),
      });

      if (!res.ok) throw new Error("교체 요청 실패");

      const data = await res.json();
      const aiMsg = processChatResponse(data, songs, setSongs);
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "교체 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSend = async (message: string) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentSongs: songs.map((s) => ({ title: s.title, composer: s.composer })),
          message,
        }),
      });

      if (!res.ok) throw new Error("채팅 요청 실패");

      const data = await res.json();
      const aiMsg = processChatResponse(data, songs, setSongs);
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "응답 생성 중 오류가 발생했습니다. 다시 시도해주세요.",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/setlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: initialPrompt, songs }),
      });
      if (!res.ok) throw new Error("저장 실패");
      const data = await res.json();
      setSetlistId(data.id);
      setAppState("confirmed");
    } catch {
      alert("저장 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setAppState("welcome");
    setMessages([]);
    setSongs([]);
    setSetlistId(null);
    setInitialPrompt("");
  };

  if (appState === "welcome") {
    return (
      <div className="flex flex-col min-h-screen bg-bg">
        <Header onReset={handleReset} />
        <WelcomeScreen onSubmit={handleInitialSubmit} isLoading={isLoading} />
      </div>
    );
  }

  if (appState === "confirmed") {
    return (
      <div className="flex flex-col min-h-screen bg-bg">
        <Header onReset={handleReset} />
        <div className="flex-1 overflow-y-auto px-4 py-8">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-text">선곡이 확정되었습니다</h2>
              <p className="text-sm text-text-secondary">아래 URL을 복사하여 찬양팀원들에게 공유하세요</p>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-bg-card">
              <input
                type="text"
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/setlist/${setlistId}`}
                className="flex-1 text-sm text-text-secondary bg-transparent focus:outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(`${window.location.origin}/setlist/${setlistId}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
              >
                {copied ? "복사됨" : "복사"}
              </button>
            </div>

            <div className="space-y-3">
              {songs.map((song, i) => (
                <SongCard key={song.id} song={song} index={i} isConfirmed />
              ))}
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3 rounded-xl border border-border text-text-secondary font-medium hover:bg-bg-card transition-colors"
            >
              새 선곡 시작하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <Header onReset={handleReset} />
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {messages.map((msg) => (
            <div key={msg.id}>
              <ChatMessage role={msg.role}>{msg.content}</ChatMessage>
              {msg.songs && (
                <div className="space-y-3 mb-4">
                  {msg.songs.map((song, i) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      index={i}
                      onSwapRequest={handleSwapRequest}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <ChatMessage role="assistant">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.3s]" />
              </span>
            </ChatMessage>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {songs.length > 0 && !isLoading && (
        <div className="border-t border-border bg-bg px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={handleConfirm}
              className="w-full py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors"
            >
              이 곡 목록으로 확정하기
            </button>
          </div>
        </div>
      )}

      <ChatInput onSend={handleChatSend} disabled={isLoading} />
    </div>
  );
}

function Header({ onReset }: { onReset: () => void }) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto flex items-center justify-between px-4 h-14">
        <button onClick={onReset} className="flex items-center gap-2 text-text hover:text-primary transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
          <span className="font-semibold text-sm">STLC 찬양</span>
        </button>
        <button
          onClick={onReset}
          className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text hover:border-text-muted transition-colors"
        >
          새 선곡
        </button>
      </div>
    </header>
  );
}
