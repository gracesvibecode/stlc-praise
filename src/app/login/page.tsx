"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "3rem 2rem",
          borderRadius: "1rem",
          background: "var(--card-bg)",
          border: "1px solid var(--border)",
          maxWidth: "400px",
          width: "100%",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🎵</div>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "0.5rem",
          }}
        >
          STLC 찬양 선곡 도우미
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: "2rem",
            fontSize: "0.9rem",
          }}
        >
          AI 기반 찬양 추천 서비스
        </p>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.75rem 1.5rem",
            borderRadius: "0.5rem",
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--text)",
            fontSize: "0.95rem",
            fontWeight: 500,
            cursor: loading ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            opacity: loading ? 0.7 : 1,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
            />
            <path
              fill="#FBBC05"
              d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58Z"
            />
          </svg>
          {loading ? "로그인 중..." : "Google로 로그인"}
        </button>
      </div>
    </div>
  );
}
