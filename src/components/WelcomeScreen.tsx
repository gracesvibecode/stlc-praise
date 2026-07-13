"use client";

import { useState } from "react";

const EXAMPLE_PROMPTS = [
  "성탄절 예배에 어울리는 기쁜 찬양",
  "고백과 간구 주제, 느린 템포",
  "성도의 교제, 밝고 경쾌한 곡",
  "부활절 감사 찬양, 중간 템포",
];

const SONG_COUNTS = [3, 4, 5, 6, 7, 8] as const;

interface WelcomeScreenProps {
  onSubmit: (prompt: string, songCount: number) => void;
  isLoading: boolean;
}

export default function WelcomeScreen({ onSubmit, isLoading }: WelcomeScreenProps) {
  const [prompt, setPrompt] = useState("");
  const [songCount, setSongCount] = useState<number>(5);

  const handleSubmit = () => {
    if (!prompt.trim() || isLoading) return;
    onSubmit(prompt.trim(), songCount);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-50 mb-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text">STLC 찬양 선곡 도우미</h1>
          <p className="text-text-secondary text-sm">
            예배 주제, 절기, 분위기를 알려주시면 AI가 찬양곡을 추천해드립니다
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              onClick={() => setPrompt(example)}
              className="px-3 py-1.5 text-sm rounded-full border border-border bg-bg-card text-text-secondary hover:border-primary hover:text-primary transition-colors"
            >
              {example}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="예배 주제, 절기, 원하는 분위기를 입력해주세요..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-border bg-bg-card text-text placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">
              추천곡 수 <span className="text-accent">*</span>
            </label>
            <div className="flex gap-2">
              {SONG_COUNTS.map((count) => (
                <button
                  key={count}
                  onClick={() => setSongCount(count)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    songCount === count
                      ? "bg-primary text-white"
                      : "bg-bg-card border border-border text-text-secondary hover:border-primary"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isLoading}
            className="w-full py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "추천 중..." : "찬양곡 추천받기"}
          </button>
        </div>
      </div>
    </div>
  );
}
