# STLC 찬양 선곡 도우미 — 기술 스택 명세

**최종 업데이트:** 2026년 7월 15일

---

## 1. 프레임워크 및 런타임

| 기술 | 버전 | 역할 |
|------|------|------|
| **Next.js** | 16.2.10 | 풀스택 React 프레임워크 (App Router) |
| **React** | 19.2.4 | UI 라이브러리 |
| **React DOM** | 19.2.4 | React 브라우저 렌더링 |
| **TypeScript** | ^5 | 타입 안전성 |
| **Node.js** | 로컬 환경 | 서버 런타임 |

### Next.js 16 주요 특징
- **App Router** 사용 (Pages Router 미사용)
- **Turbopack** 기반 개발 서버
- `params`가 **Promise 기반** — `await params` 필요
- **`proxy.ts`** 사용 (Next.js 16에서 middleware.ts 대신 사용)
- 서버 컴포넌트 기본 + `"use client"` 지시문으로 클라이언트 컴포넌트 지정
- API Route는 `src/app/api/*/route.ts` 패턴

---

## 2. 스타일링

| 기술 | 버전 | 역할 |
|------|------|------|
| **Tailwind CSS** | ^4 | 유틸리티 퍼스트 CSS 프레임워크 |
| **@tailwindcss/postcss** | ^4 | PostCSS 플러그인 |

### 디자인 시스템

**CSS 변수 기반 디자인 토큰** (`globals.css`):

```
Primary (인디고 블루)
├── --primary: #4355B0       (메인 컬러)
├── --primary-light: #5B6DC2 (호버)
├── --primary-dark: #354499  (액티브)
├── --primary-50: #EEF0F9    (배경 틴트)
└── --primary-100: #D4D9F0   (강조 배경)

Accent: #E8913A (오렌지, 교체 버튼 등)
```

**다크모드 구현:**
- `prefers-color-scheme: dark` 미디어 쿼리 (시스템 기본)
- `data-theme="dark"` / `data-theme="light"` 속성 오버라이드
- 토큰 레벨에서 재정의 — 컴포넌트 코드 변경 없이 테마 전환

**Tailwind v4 연동:**
- `@theme inline` 블록으로 CSS 변수를 Tailwind 클래스에 매핑
- 예: `bg-primary`, `text-text-secondary`, `border-border` 등 커스텀 클래스 사용

### 타이포그래피

| 폰트 | 형식 | 용도 |
|------|------|------|
| **Pretendard Variable** | woff2 (로컬 파일) | 한국어 본문 전체 |

- `src/fonts/PretendardVariable.woff2`에 저장
- `next/font/local`로 로딩, `--font-pretendard` CSS 변수 지정
- Tailwind의 `--font-sans`에 매핑

---

## 3. AI / LLM

| 기술 | 버전 | 역할 |
|------|------|------|
| **@google/genai** | ^2.11.0 | Google Gemini AI SDK (생성 + 임베딩) |

### 생성 모델 (텍스트 생성)

```
Primary:  gemini-3.5-flash    (메인 추천/대화/제목 생성 모델)
Fallback: gemini-3.1-flash-lite (503/429 시 자동 전환)
```

### 임베딩 모델 (RAG용)

```
Model: gemini-embedding-2
Dimensions: 768 (outputDimensionality 설정으로 3072 → 768 축소)
```

- 원래 3072차원이지만 Supabase pgvector HNSW 인덱스 2000차원 제한으로 768차원으로 축소
- `src/lib/rag.ts`의 `embedText()` 함수에서 사용

### 핵심 함수 (`src/lib/gemini.ts`)

| 함수 | 용도 | 입력 | 출력 |
|------|------|------|------|
| `callWithFallback()` | 모델 폴백 래퍼 | config 객체 | Gemini 응답 |
| `recommendSongs()` | 초기 추천 | prompt, songCount, ragContext | `{ songs: Song[] }` |
| `chatSwap()` | 채팅 기반 교체/추천/대화 | currentSongs, message, ragContext | `{ action, message, ... }` |
| `swapSong()` | 단일 곡 교체 (미사용) | currentSongs, index, request | Song |
| `generateTitle()` | 세션 제목 자동 생성 | userMessage | string (빈 문자열=실패) |

### 구조화된 출력 (Structured Output)

Gemini의 `responseMimeType: "application/json"` + `responseSchema`를 사용하여 타입 안전한 JSON 응답 강제:

```typescript
// Song 스키마
{
  title: string,      // 곡 제목
  composer: string,    // 작곡가/아티스트
  key: string,         // 연주 키 (예: "A", "Bb")
  bpm: number,         // 분당 박자 수
  tempo: "느리게" | "보통" | "빠르게",
  styles: string[],    // 장르/주제 태그
  reason: string       // 선정 이유
}

// Chat 액션 스키마
{
  action: "swap" | "recommend" | "chat",
  message: string,     // 사용자에게 보여줄 메시지
  swapIndex?: number,  // swap 시 교체할 곡 인덱스 (0-based)
  newSong?: Song,      // swap 시 교체곡
  newSongs?: Song[]    // recommend 시 새 곡 목록
}
```

### 에러 처리

| 계층 | 전략 |
|------|------|
| `callWithFallback()` | 503/429 → 다음 모델로 폴백 |
| `withRetry()` (API 라우트) | 503/429 → 최대 2회 재시도, 3초 간격 |
| API 라우트 | 429 → "요청이 너무 빈번합니다" / 기타 → "오류가 발생했습니다" |
| `generateTitle()` | 전체 try-catch → 실패 시 빈 문자열 반환 (기존 제목 유지) |

---

## 4. RAG (Retrieval-Augmented Generation)

### 아키텍처

```
사용자 쿼리 텍스트
  ↓ embedText()
768차원 벡터
  ↓ match_songs() RPC
cosine similarity 기반 상위 N개 곡 검색
  ↓ formatRAGContext()
텍스트 포맷 "[참고 곡 데이터베이스]"
  ↓ Gemini 프롬프트에 주입
RAG 기반 AI 응답
```

### 벡터 검색 파라미터

| 파라미터 | 기본값 | 설명 |
|---------|--------|------|
| `match_count` | 10 | 최대 반환 곡 수 |
| `match_threshold` | 0.3 | 최소 유사도 (cosine similarity) |
| `filter_user_id` | null | null이면 공용만, UUID면 공용+개인 |

### 2-tier 데이터 구조

```
songs_knowledge
├── 공용 데이터 (user_id IS NULL)
│   └── 모든 사용자에게 검색됨
└── 개인 데이터 (user_id = UUID)
    └── 해당 사용자에게만 검색됨
```

### 핵심 파일

| 파일 | 역할 |
|------|------|
| `src/lib/rag.ts` | 임베딩 생성, 벡터 검색, 컨텍스트 포맷 |
| `src/app/api/songs/route.ts` | 곡 CRUD API (GET/POST/DELETE) |
| `src/app/api/recommend/route.ts` | RAG 검색 → 추천 |
| `src/app/api/chat/route.ts` | RAG 검색 → 채팅 응답 |

---

## 5. 인증 (Authentication)

| 기술 | 버전 | 역할 |
|------|------|------|
| **Supabase Auth** | — | 인증 백엔드 (Google OAuth 관리) |
| **@supabase/ssr** | ^0.12.1 | 서버사이드 Supabase 클라이언트 (쿠키 기반 세션) |
| **Google OAuth 2.0** | — | 소셜 로그인 프로바이더 |

### 인증 흐름 (PKCE)

```
1. 클라이언트: supabase.auth.signInWithOAuth({ provider: "google" })
2. → Google 동의 화면 (consent screen)
3. → Supabase /auth/v1/callback (code 수신)
4. → /auth/callback/route.ts (exchangeCodeForSession)
5. → 메인 페이지 리다이렉트 (인증 완료)
```

### Supabase 클라이언트 이원화

| 파일 | 용도 | 패키지 |
|------|------|--------|
| `src/lib/supabase-browser.ts` | 클라이언트 컴포넌트 | `createBrowserClient` from `@supabase/ssr` |
| `src/lib/supabase-server.ts` | 서버 컴포넌트 / API 라우트 | `createServerClient` from `@supabase/ssr` (cookies) |
| `src/lib/supabase.ts` | 서비스 역할 클라이언트 (RAG 등) | `createClient` from `@supabase/supabase-js` |

### 인증 미들웨어 (`src/proxy.ts`)

Next.js 16에서 `middleware.ts` 대신 `proxy.ts` 사용:

```typescript
PUBLIC_PATHS = ["/login", "/auth/callback", "/api/openapi", "/docs"]
// 위 경로: 인증 없이 접근 가능
// 그 외: auth.getUser() 확인 → 미인증 시 /login 리다이렉트
// /api/ 경로: 리다이렉트 없이 통과 (각 API 자체 인증)
```

### 인증 헬퍼 (`src/lib/auth.ts`)

| 함수 | 용도 |
|------|------|
| `getUser()` | 현재 사용자 반환 (없으면 null) |
| `requireUser()` | 현재 사용자 반환 (없으면 throw Error) |

### Google OAuth 외부 설정

| 항목 | 위치 |
|------|------|
| Client ID / Secret | Google Cloud Console → OAuth 2.0 Client |
| Provider 설정 | Supabase Dashboard → Auth → Providers → Google |
| Site URL | Supabase Dashboard → Auth → URL Configuration |
| Redirect URLs | `http://localhost:3000/auth/callback` (dev), `https://stlc-praise.vercel.app/auth/callback` (prod) |
| Publishing status | Production (게시 완료) |
| OAuth consent screen | Google Cloud Console → APIs & Services |

---

## 6. 데이터베이스

| 기술 | 버전 | 역할 |
|------|------|------|
| **Supabase** (PostgreSQL) | — | 메인 데이터베이스 + 인증 + 벡터 검색 |
| **@supabase/supabase-js** | ^2.110.2 | Supabase 클라이언트 SDK |
| **@supabase/ssr** | ^0.12.1 | 서버사이드 쿠키 기반 인증 클라이언트 |
| **pgvector** | — | PostgreSQL 벡터 확장 (similarity search) |

### 프로젝트 정보

| 항목 | 값 |
|------|-----|
| Region | Asia Pacific (Sydney) |
| Project URL | https://nvdyxmveilxcfwnudvfr.supabase.co |
| Dashboard | https://supabase.com/dashboard/project/nvdyxmveilxcfwnudvfr |

### 테이블 스키마

#### setlists (Day 1)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | text (PK) | UUID 기반 고유 ID |
| `prompt` | text | 사용자 입력 프롬프트 |
| `songs` | jsonb | Song[] 배열 JSON |
| `created_at` | timestamptz | 생성 시각 |

#### songs_knowledge (Day 2 — RAG)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid (PK) | 자동 생성 UUID |
| `title` | text | 곡 제목 |
| `composer` | text | 작곡가/아티스트 |
| `key` | text | 연주 키 |
| `bpm` | integer | BPM |
| `tempo` | text | "느리게" / "보통" / "빠르게" |
| `styles` | text[] | 장르/스타일 태그 |
| `themes` | text[] | 주제 태그 |
| `seasons` | text[] | 절기 태그 |
| `notes` | text | 메모/참고 |
| `content` | text | 검색용 전체 텍스트 |
| `embedding` | vector(768) | gemini-embedding-2 벡터 |
| `user_id` | uuid (FK → auth.users) | NULL=공용, UUID=개인 |
| `created_at` | timestamptz | 생성 시각 |

#### chat_sessions (Day 2 — 세션)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid (PK) | 자동 생성 UUID |
| `user_id` | uuid (FK → auth.users) | 세션 소유자 |
| `title` | text | 세션 제목 (AI 생성) |
| `created_at` | timestamptz | 생성 시각 |
| `updated_at` | timestamptz | 자동 갱신 (트리거) |

#### chat_messages (Day 2 — 메시지)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid (PK) | 자동 생성 UUID |
| `session_id` | uuid (FK → chat_sessions) | 소속 세션 |
| `role` | text | "user" / "assistant" |
| `content` | text | 메시지 내용 |
| `songs_json` | jsonb | 추천곡 배열 (있을 경우) |
| `created_at` | timestamptz | 생성 시각 |

### 인덱스

| 테이블 | 인덱스 | 타입 |
|--------|--------|------|
| songs_knowledge | embedding | HNSW (vector_cosine_ops) |
| songs_knowledge | user_id | B-tree |
| chat_sessions | (user_id, updated_at DESC) | B-tree |
| chat_messages | (session_id, created_at) | B-tree |

### PostgreSQL 함수

| 함수 | 용도 |
|------|------|
| `match_songs(query_embedding, threshold, count, user_id)` | 벡터 유사도 검색 + user_id 필터 |
| `update_updated_at()` | chat_sessions.updated_at 자동 갱신 트리거 |

### RLS (Row Level Security) 정책

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| setlists | 공개 | 공개 | — | — |
| songs_knowledge | 공용 + 본인 | 본인 | 본인 | 본인 |
| chat_sessions | 본인 | 본인 | 본인 | 본인 |
| chat_messages | 세션 소유자 | 세션 소유자 | — | — |

### SQL 마이그레이션 파일

| 파일 | 내용 | 실행 순서 |
|------|------|----------|
| `docs/supabase-rag-migration.sql` | pgvector 확장, songs_knowledge, match_songs, HNSW 인덱스 | 1번째 |
| `docs/supabase-auth-migration.sql` | chat_sessions/messages, user_id 추가, RLS 업데이트, 트리거 | 2번째 |

---

## 7. API 문서화

| 기술 | 버전 | 역할 |
|------|------|------|
| **swagger-ui-react** | ^5.32.8 | Swagger UI 렌더링 |

### 구성

| 파일 | 역할 |
|------|------|
| `src/app/api/openapi/route.ts` | OpenAPI 3.0.3 JSON 스펙 제공 |
| `src/app/docs/page.tsx` | Swagger UI 페이지 (클라이언트 컴포넌트) |
| `src/types/swagger-ui-react.d.ts` | swagger-ui-react 타입 선언 |

**접근:** `/docs` (인증 불필요)

---

## 8. API 라우트 전체 목록

| 엔드포인트 | 메서드 | 인증 | 용도 |
|-----------|--------|------|------|
| `/api/recommend` | POST | 필요 | AI 찬양곡 추천 (RAG 포함) |
| `/api/chat` | POST | 필요 | 채팅 기반 교체/추천/대화 (RAG 포함) |
| `/api/setlist` | POST | — | 셋리스트 저장 |
| `/api/songs` | GET | 필요 | 곡 지식 베이스 목록 조회 |
| `/api/songs` | POST | 필요 | 곡 추가 (임베딩 자동 생성) |
| `/api/songs` | DELETE | 필요 | 곡 삭제 |
| `/api/sessions` | GET | 필요 | 사용자 세션 목록 |
| `/api/sessions` | POST | 필요 | 새 세션 생성 |
| `/api/sessions/[id]` | PATCH | 필요 | 세션 제목 수정 |
| `/api/sessions/[id]` | DELETE | 필요 | 세션 삭제 |
| `/api/sessions/[id]/messages` | GET | 필요 | 세션 메시지 조회 |
| `/api/sessions/[id]/messages` | POST | 필요 | 메시지 저장 |
| `/api/sessions/title` | POST | 필요 | AI 제목 생성 + 세션 업데이트 |
| `/api/openapi` | GET | — | OpenAPI 스펙 JSON |
| `/api/sheet-music` | GET | — | 악보 검색 (미사용) |

---

## 9. 프론트엔드 컴포넌트 아키텍처

```
page.tsx (메인 — 상태 머신 + 세션 관리)
├── Sidebar             # 세션 목록, 새 상담, 로그아웃 (모바일: 접이식 drawer)
├── Header              # 상단 네비게이션 + 햄버거 메뉴 (인라인 컴포넌트)
├── WelcomeScreen       # 시작 화면 (프롬프트, 예시 칩, 곡 수 선택)
├── ChatMessage         # 메시지 버블 (user: 우측 / assistant: 좌측)
├── SongCard            # 곡 정보 카드 (악보 보기, 교체 버튼)
└── ChatInput           # 채팅 입력 필드 + 전송 버튼
```

### 반응형 디자인

| 뷰포트 | 사이드바 동작 |
|--------|-------------|
| 모바일 (< 768px) | 기본 숨김, 햄버거 버튼으로 슬라이드 오픈, 오버레이 배경, 자동 닫힘 |
| 데스크톱 (≥ 768px) | 항상 표시 (280px 고정), CSS `position: relative` 오버라이드 |

### 상태 관리

클라이언트 컴포넌트에서 `useState`로 관리 (별도 상태 라이브러리 미사용):

| 상태 | 타입 | 역할 |
|------|------|------|
| `user` | `User \| null` | 인증된 사용자 정보 |
| `authLoading` | `boolean` | 인증 확인 중 |
| `sidebarOpen` | `boolean` | 모바일 사이드바 열림 상태 |
| `sessions` | `Session[]` | 사이드바 세션 목록 |
| `currentSessionId` | `string \| null` | 현재 활성 세션 ID |
| `appState` | `"welcome" \| "chat" \| "confirmed"` | 화면 전환 |
| `messages` | `Message[]` | 채팅 메시지 히스토리 |
| `songs` | `Song[]` | 현재 추천 곡 목록 |
| `isLoading` | `boolean` | API 호출 중 상태 |
| `copied` | `boolean` | URL 복사 피드백 |
| `setlistId` | `string \| null` | 저장된 셋리스트 ID |
| `initialPrompt` | `string` | 최초 입력 프롬프트 |

### 페이지 라우트

| 경로 | 컴포넌트 | 인증 | 설명 |
|------|----------|------|------|
| `/` | `page.tsx` (클라이언트) | 필요 | 메인 앱 (추천 + 채팅 + 사이드바) |
| `/login` | `login/page.tsx` (클라이언트) | 불필요 | Google 로그인 페이지 |
| `/auth/callback` | `auth/callback/route.ts` (API) | — | OAuth 콜백 핸들러 |
| `/setlist/[id]` | `setlist/[id]/page.tsx` (서버) | 불필요 | 공유 셋리스트 페이지 |
| `/docs` | `docs/page.tsx` (클라이언트) | 불필요 | Swagger UI |

---

## 10. 배포

| 기술 | 역할 |
|------|------|
| **Vercel** | 프로덕션 호스팅 + 자동 배포 |
| **GitHub** | 소스 코드 관리 |

### 배포 정보

| 항목 | 값 |
|------|-----|
| 프로덕션 URL | https://stlc-praise.vercel.app |
| GitHub 저장소 | https://github.com/gracesvibecode/stlc-praise |
| 브랜치 | `main` (자동 배포) |
| 빌드 커맨드 | `next build` |

### 환경 변수

| 변수 | 용도 | 위치 |
|------|------|------|
| `GEMINI_API_KEY` | Gemini AI API 키 (생성 + 임베딩) | Vercel + .env.local |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Vercel + .env.local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 클라이언트 인증 | Vercel + .env.local |

> Google OAuth Client ID/Secret은 Supabase Auth 대시보드에서 관리 (앱 환경변수에 불필요)

---

## 11. 보안

| 항목 | 구현 |
|------|------|
| API 키 보호 | 서버 사이드 환경 변수 (`GEMINI_API_KEY`는 `NEXT_PUBLIC_` 접두사 없음) |
| Supabase 클라이언트 키 | `NEXT_PUBLIC_` 접두사 (anon key, RLS로 보호) |
| .env 파일 | `.gitignore`에 `.env*` 포함 |
| RLS | 모든 테이블에 Row Level Security 적용 |
| 인증 프록시 | `proxy.ts`에서 미인증 접근 차단 |
| API 인증 | `requireUser()`로 API 라우트 보호 |
| OAuth PKCE | Supabase Auth의 PKCE 플로우 사용 (임시 코드 교환) |
| 입력 검증 | API 라우트에서 필수 파라미터 검증 |

---

## 12. 비용 구조

| 서비스 | 무료 한도 | 현재 사용량 |
|--------|----------|------------|
| **Gemini Flash** | 무료 (rate limit 있음) | 메인 AI 엔진 |
| **Gemini Embedding** | 무료 (rate limit 있음) | RAG 임베딩 |
| **Supabase** | Free tier (500MB DB, 무제한 API) | 전체 DB + Auth |
| **Vercel** | Hobby plan (무료) | 호스팅 |
| **GitHub** | Free (public repo) | 소스 관리 |
| **Google OAuth** | 무료 | 소셜 로그인 |

**현재 월 비용: $0**

---

## 13. 개발 도구

| 도구 | 용도 |
|------|------|
| **npm** | 패키지 관리 |
| **ESLint** | 코드 린팅 (eslint-config-next) |
| **Turbopack** | Next.js 개발 서버 번들러 |
| **gh** (GitHub CLI) | 저장소 생성 및 관리 |
| **tsx** | TypeScript 스크립트 실행 (시드 데이터 등) |

---

## 14. 의존성 전체 목록

### Production Dependencies

```json
{
  "@google/genai": "^2.11.0",
  "@supabase/ssr": "^0.12.1",
  "@supabase/supabase-js": "^2.110.2",
  "next": "16.2.10",
  "react": "19.2.4",
  "react-dom": "19.2.4",
  "swagger-ui-react": "^5.32.8"
}
```

### Dev Dependencies

```json
{
  "@tailwindcss/postcss": "^4",
  "@types/node": "^20",
  "@types/react": "^19",
  "@types/react-dom": "^19",
  "eslint": "^9",
  "eslint-config-next": "16.2.10",
  "tailwindcss": "^4",
  "typescript": "^5"
}
```
