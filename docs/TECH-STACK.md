# STLC 찬양 선곡 도우미 — 기술 스택 명세

**최종 업데이트:** 2026년 7월 13일

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
| **@google/genai** | ^2.11.0 | Google Gemini AI SDK |

### 모델 구성

```
Primary:  gemini-3.5-flash    (메인 추천 모델)
Fallback: gemini-3.1-flash-lite (503/429 시 자동 전환)
```

### 핵심 함수 (`src/lib/gemini.ts`)

| 함수 | 용도 | 입력 | 출력 |
|------|------|------|------|
| `callWithFallback()` | 모델 폴백 래퍼 | config 객체 | Gemini 응답 |
| `recommendSongs()` | 초기 추천 | prompt, songCount | `{ songs: Song[] }` |
| `chatSwap()` | 채팅 기반 교체/추천/대화 | currentSongs, message | `{ action, message, ... }` |
| `swapSong()` | 단일 곡 교체 (미사용) | currentSongs, index, request | Song |

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

---

## 4. 데이터베이스

| 기술 | 버전 | 역할 |
|------|------|------|
| **Supabase** (PostgreSQL) | — | 셋리스트 저장, 공유 URL |
| **@supabase/supabase-js** | ^2.110.2 | Supabase 클라이언트 SDK |

### 프로젝트 정보

| 항목 | 값 |
|------|-----|
| Region | Asia Pacific (Sydney) |
| Project URL | https://nvdyxmveilxcfwnudvfr.supabase.co |
| Dashboard | https://supabase.com/dashboard/project/nvdyxmveilxcfwnudvfr |

### 테이블 스키마

**setlists**

| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `id` | text (PK) | `gen_random_uuid()::text` | UUID 기반 고유 ID |
| `prompt` | text (NOT NULL) | — | 사용자 입력 프롬프트 |
| `songs` | jsonb (NOT NULL) | — | Song[] 배열 JSON |
| `created_at` | timestamptz | `now()` | 생성 시각 |

### RLS (Row Level Security) 정책

| 정책 | 동작 | 조건 |
|------|------|------|
| Anyone can read setlists | SELECT | `true` (공개 읽기) |
| Anyone can insert setlists | INSERT | `true` (공개 쓰기) |

---

## 5. API 라우트

| 엔드포인트 | 메서드 | 용도 | 입력 | 출력 |
|-----------|--------|------|------|------|
| `/api/recommend` | POST | 초기 추천 | `{ prompt, songCount }` | `{ songs: Song[] }` |
| `/api/chat` | POST | 채팅/교체/재추천 | `{ currentSongs, message }` | `{ action, message, ... }` |
| `/api/setlist` | POST | 셋리스트 저장 | `{ prompt, songs }` | `{ id: string }` |
| `/api/sheet-music` | GET | 악보 이미지 검색 | `?title=곡제목` | `{ images: [] }` |

> `/api/sheet-music`는 Google Custom Search API 403 문제로 현재 미사용 상태. 팝업 방식으로 대체됨.

---

## 6. 배포

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

### Vercel 환경 변수

| 변수 | 용도 |
|------|------|
| `GEMINI_API_KEY` | Gemini AI API 인증 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 클라이언트 인증 |

---

## 7. 프론트엔드 컴포넌트 아키텍처

```
page.tsx (메인 — 상태 머신 관리)
├── Header              # 상단 네비게이션 (인라인 컴포넌트)
├── WelcomeScreen       # 시작 화면 (프롬프트, 예시 칩, 곡 수 선택)
├── ChatMessage         # 메시지 버블 (user: 우측 / assistant: 좌측)
├── SongCard            # 곡 정보 카드 (악보 보기, 교체 버튼)
└── ChatInput           # 채팅 입력 필드 + 전송 버튼
```

### 상태 관리

클라이언트 컴포넌트에서 `useState`로 관리 (별도 상태 라이브러리 미사용):

| 상태 | 타입 | 역할 |
|------|------|------|
| `appState` | `"welcome" \| "chat" \| "confirmed"` | 화면 전환 |
| `messages` | `Message[]` | 채팅 메시지 히스토리 |
| `songs` | `Song[]` | 현재 추천 곡 목록 |
| `isLoading` | `boolean` | API 호출 중 상태 |
| `copied` | `boolean` | URL 복사 피드백 |
| `setlistId` | `string \| null` | 저장된 셋리스트 ID |
| `initialPrompt` | `string` | 최초 입력 프롬프트 |

---

## 8. 보안

| 항목 | 구현 |
|------|------|
| API 키 보호 | 서버 사이드 환경 변수 (`GEMINI_API_KEY`는 `NEXT_PUBLIC_` 접두사 없음) |
| Supabase 클라이언트 키 | `NEXT_PUBLIC_` 접두사 (anon key, RLS로 보호) |
| .env 파일 | `.gitignore`에 `.env*` 포함 |
| RLS | Supabase 테이블에 Row Level Security 적용 |
| 입력 검증 | API 라우트에서 필수 파라미터 검증 |

---

## 9. 비용 구조

| 서비스 | 무료 한도 | 현재 사용량 |
|--------|----------|------------|
| **Gemini Flash** | 무료 (rate limit 있음) | 메인 AI 엔진 |
| **Supabase** | Free tier (500MB DB, 무제한 API) | 셋리스트 저장 |
| **Vercel** | Hobby plan (무료) | 호스팅 |
| **GitHub** | Free (public repo) | 소스 관리 |

**현재 월 비용: $0**

---

## 10. 개발 도구

| 도구 | 용도 |
|------|------|
| **npm** | 패키지 관리 |
| **ESLint** | 코드 린팅 (eslint-config-next) |
| **Turbopack** | Next.js 개발 서버 번들러 |
| **gh** (GitHub CLI) | 저장소 생성 및 관리 |

---

## 11. 의존성 전체 목록

### Production Dependencies

```json
{
  "@google/genai": "^2.11.0",
  "@supabase/supabase-js": "^2.110.2",
  "next": "16.2.10",
  "react": "19.2.4",
  "react-dom": "19.2.4"
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
