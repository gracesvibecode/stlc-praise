"use client";

import { type User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-browser";

export interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface SidebarProps {
  user: User | null;
  sessions: Session[];
  currentSessionId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
}

export default function Sidebar({
  user,
  sessions,
  currentSessionId,
  isOpen,
  onToggle,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}: SidebarProps) {
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handleSelectSession = (id: string) => {
    onSelectSession(id);
    if (window.innerWidth < 768) onToggle();
  };

  const handleNewSession = () => {
    onNewSession();
    if (window.innerWidth < 768) onToggle();
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={onToggle}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 40,
          }}
          className="md-hidden-overlay"
        />
      )}
      <aside
        style={{
          width: "280px",
          minWidth: "280px",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--border)",
          background: "var(--bg-card)",
          position: "fixed",
          left: isOpen ? 0 : "-280px",
          top: 0,
          zIndex: 50,
          transition: "left 0.3s ease",
        }}
      >
      <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>
        <button
          onClick={handleNewSession}
          style={{
            width: "100%",
            padding: "0.625rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--text)",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          새 상담
        </button>
      </div>

      <div style={{ padding: "0.75rem 1rem 0.25rem" }}>
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-muted)",
          }}
        >
          상담 세션
        </span>
      </div>

      <nav style={{ flex: 1, overflowY: "auto", padding: "0.25rem 0.5rem" }}>
        {user ? (
          <>
            {sessions.map((session) => (
              <div
                key={session.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <button
                  onClick={() => handleSelectSession(session.id)}
                  style={{
                    flex: 1,
                    textAlign: "left",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.375rem",
                    border: "none",
                    background:
                      session.id === currentSessionId
                        ? "var(--primary-50)"
                        : "transparent",
                    color:
                      session.id === currentSessionId
                        ? "var(--primary)"
                        : "var(--text)",
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: session.id === currentSessionId ? 600 : 400,
                  }}
                  title={session.title}
                >
                  {session.title}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: "0.25rem",
                    borderRadius: "0.25rem",
                    fontSize: "0.75rem",
                    opacity: 0.5,
                    flexShrink: 0,
                  }}
                  title="삭제"
                >
                  ✕
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <p
                style={{
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: "0.8rem",
                  padding: "2rem 0",
                }}
              >
                아직 상담 내역이 없습니다
              </p>
            )}
          </>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem 1rem",
              gap: "0.75rem",
              textAlign: "center",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ opacity: 0.5 }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              로그인 후 상담 내역 저장 및<br />맞춤형 추천 서비스를 이용하세요
            </p>
          </div>
        )}
      </nav>

      {user ? (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ overflow: "hidden" }}>
            <p
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.user_metadata?.full_name || user.email?.split("@")[0]}
            </p>
            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "0.25rem",
              fontSize: "0.75rem",
              flexShrink: 0,
            }}
            title="로그아웃"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      ) : (
        <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--border)" }}>
          <button
            onClick={() => { window.location.href = "/login"; }}
            style={{
              width: "100%",
              padding: "0.625rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "var(--primary)",
              color: "white",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10,17 15,12 10,7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            로그인하기
          </button>
        </div>
      )}
    </aside>
    </>
  );
}
