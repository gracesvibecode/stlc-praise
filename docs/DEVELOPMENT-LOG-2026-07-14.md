# STLC 찬양 선곡 도우미 — 개발 기록 (Day 2~3)

**날짜:** 2026년 7월 14~15일  
**이전 기록:** [DEVELOPMENT-LOG-2026-07-13.md](./DEVELOPMENT-LOG-2026-07-13.md)  
**배포 URL:** https://stlc-praise.vercel.app  
**GitHub:** https://github.com/gracesvibecode/stlc-praise

---

## 1. 개발 요약

Day 1(7/13)의 기본 추천 기능 위에 다음을 추가 구현:

| 기능 | 상태 |
|------|------|
| RAG 시스템 (Supabase pgvector + Gemini Embedding) | 완료 |
| 개인화 RAG (2-tier: 공용 + 사용자별) | 완료 |
| Google OAuth 로그인 (Supabase Auth) | 완료 |
| 채팅 세션 히스토리 + 사이드바 UI | 완료 |
| AI 기반 세션 제목 자동 생성 | 완료 |
| Swagger UI API 문서화 | 완료 |
| 곡 데이터베이스 시드 데이터 (20곡) | 완료 |
| 모바일 반응형 사이드바 (접이식 drawer) | 완료 |
| 프로덕션 Google OAuth 배포 설정 | 완료 |

---

## 2. 구현 상세

### 2.1 RAG 시스템

사용자의 곡 데이터베이스를 기반으로 LLM이 참고하여 답변할 수 있는 RAG(Retrieval-Augmented Generation) 파이프라인 구축.

**파이프라인 흐름:**
```
사용자 쿼리
  → embedText() (gemini-embedding-2, 768차원)
  → match_songs() RPC (pgvector cosine similarity)
  → formatRAGContext() (검색 결과를 텍스트로 포맷)
  → Gemini 프롬프트에 [참고 곡 데이터베이스]로 주입
  → AI 응답 생성
```

**핵심 파일:**
- `src/lib/rag.ts` — RAG 핵심 라이브러리 (임베딩, 검색, 포맷)
- `src/app/api/songs/route.ts` — 곡 지식 베이스 CRUD API
- `docs/supabase-rag-migration.sql` — pgvector 확장, songs_knowledge 테이블, match_songs 함수, HNSW 인덱스

**임베딩 모델 선택 과정:**
| 시도 | 결과 |
|------|------|
| `text-embedding-004` | API 키 접근 불가 |
| `gemini-embedding-2` (3072차원) | HNSW 인덱스 2000차원 제한 초과 |
| `gemini-embedding-2` (768차원, `outputDimensionality` 설정) | 최종 채택 |

**RAG 함수 (src/lib/rag.ts):**
| 함수 | 용도 |
|------|------|
| `embedText(text)` | gemini-embedding-2로 768차원 벡터 생성 |
| `buildContent(song)` | 곡 메타데이터를 검색 가능한 텍스트로 변환 |
| `addSong(song)` | 곡 임베딩 생성 후 DB에 저장 |
| `searchSongs(query, limit, threshold, userId?)` | 벡터 유사도 검색 (cosine distance) |
| `formatRAGContext(songs)` | 검색 결과를 LLM 프롬프트용 텍스트로 포맷 |

---

### 2.2 개인화 RAG (2-tier 구조)

공용 곡 데이터베이스 + 사용자별 개인 곡 데이터를 분리하여 관리.

**데이터 구조:**
```
songs_knowledge 테이블
├── user_id IS NULL  → 공용 데이터 (모든 사용자에게 노출)
└── user_id = UUID   → 개인 데이터 (해당 사용자에게만 노출)
```

**match_songs 함수 필터링 로직:**
```sql
WHERE (sk.user_id IS NULL OR sk.user_id = filter_user_id)
```

**RLS 정책:**
- SELECT: 공용(user_id IS NULL) + 본인 데이터만 조회 가능
- INSERT/UPDATE/DELETE: 본인 데이터만 변경 가능

---

### 2.3 Google OAuth 로그인

Supabase Auth + Google OAuth (PKCE flow)를 사용한 인증 시스템.

**파일 구조:**
| 파일 | 역할 |
|------|------|
| `src/app/login/page.tsx` | Google 로그인 버튼 UI (STLC 브랜딩) |
| `src/app/auth/callback/route.ts` | OAuth 콜백 핸들러 (code → session 교환) |
| `src/proxy.ts` | Next.js 16 프록시 (미인증 사용자 → /login 리다이렉트) |
| `src/lib/supabase-browser.ts` | 브라우저 Supabase 클라이언트 (`createBrowserClient`) |
| `src/lib/supabase-server.ts` | 서버 Supabase 클라이언트 (`createServerClient` + cookies) |
| `src/lib/auth.ts` | `getUser()`, `requireUser()` 헬퍼 |

**인증 흐름:**
```
로그인 버튼 클릭
  → supabase.auth.signInWithOAuth({ provider: "google" })
  → Google 동의 화면
  → Supabase /auth/v1/callback
  → /auth/callback (code 교환)
  → 메인 페이지 리다이렉트
```

**proxy.ts 동작:**
- PUBLIC_PATHS (`/login`, `/auth/callback`, `/api/openapi`, `/docs`)는 인증 없이 접근 가능
- 그 외 경로는 Supabase auth.getUser() 확인 → 미인증 시 /login으로 리다이렉트
- API 라우트(`/api/`)는 리다이렉트 대신 통과 (각 API에서 자체 인증 처리)

**Google OAuth 설정 과정에서 발생한 이슈:**
| 이슈 | 해결 |
|------|------|
| "Unsupported provider" 에러 | Supabase Auth → Google provider 활성화 |
| OAuth consent screen 미설정 | Google Cloud Console → OAuth consent screen 설정 (External, 앱명, 이메일) |
| Client Secret 불일치 | Google Console에서 새 Secret 생성 후 Supabase에 재입력 |
| 로그인 후 /login으로 리다이렉트 루프 | Supabase URL Configuration에서 Site URL(`http://localhost:3000`) + Redirect URL(`http://localhost:3000/auth/callback`) 설정 |

---

### 2.4 채팅 세션 히스토리 + 사이드바

로그인한 사용자별 대화 세션 저장 및 사이드바를 통한 세션 관리.

**DB 테이블:**
| 테이블 | 용도 |
|--------|------|
| `chat_sessions` | 세션 메타데이터 (id, user_id, title, timestamps) |
| `chat_messages` | 개별 메시지 (session_id, role, content, songs_json) |

**API 라우트:**
| 엔드포인트 | 메서드 | 용도 |
|-----------|--------|------|
| `/api/sessions` | GET | 사용자의 세션 목록 조회 |
| `/api/sessions` | POST | 새 세션 생성 |
| `/api/sessions/[id]` | PATCH | 세션 제목 수정 |
| `/api/sessions/[id]` | DELETE | 세션 삭제 |
| `/api/sessions/[id]/messages` | GET | 세션의 메시지 목록 조회 |
| `/api/sessions/[id]/messages` | POST | 메시지 저장 |
| `/api/sessions/title` | POST | AI 제목 생성 + 세션 업데이트 |

**사이드바 컴포넌트 (`src/components/Sidebar.tsx`):**
- 세션 목록 표시 (제목, 선택 상태)
- 새 상담 버튼
- 세션 삭제 버튼
- 하단: 사용자 이름/이메일 표시 + 로그아웃 버튼

**RLS 정책:**
- chat_sessions: `auth.uid() = user_id` (본인 세션만 CRUD)
- chat_messages: `session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid())` (본인 세션의 메시지만 접근)

---

### 2.5 AI 세션 제목 자동 생성

새 세션 생성 시 사용자의 첫 프롬프트를 분석하여 의미 있는 한국어 제목을 자동 생성.

**흐름:**
```
새 세션 생성
  → 초기 제목: 프롬프트 앞 30자 잘라서 표시
  → 백그라운드: generateAndSetTitle() 호출
    → /api/sessions/title API
    → generateTitle() (Gemini few-shot 프롬프트)
    → 유효한 제목(4~30자)이면 DB 업데이트 + 사이드바 반영
    → 실패 시 초기 제목(잘린 프롬프트) 유지
```

**generateTitle() 구현:**
- `callWithFallback` 사용 (모델 503 시 fallback)
- few-shot 예시 3개 포함으로 제목 품질 확보
- 후처리: "제목:" 접두사, 따옴표 제거
- 검증: 4자 이상 30자 이하만 유효

**개발 중 해결한 이슈:**
| 이슈 | 원인 | 해결 |
|------|------|------|
| 제목이 항상 "새 상담"으로 표시 | 하드코딩된 초기 제목 | 프롬프트 앞 30자를 초기 제목으로 사용 |
| AI 제목이 "빠른" 같은 저품질 | 프롬프트 부실 | few-shot 예시 추가 + 최소 4자 검증 |
| AI 제목 생성 실패 (빈 문자열 반환) | generateTitle()이 callWithFallback 미사용 → 503 시 에러 catch | callWithFallback 적용으로 fallback 모델 활용 |

---

### 2.6 Swagger UI API 문서화

모든 API 엔드포인트를 OpenAPI 3.0.3 스펙으로 정의하고 Swagger UI로 시각화.

**파일:**
| 파일 | 역할 |
|------|------|
| `src/app/api/openapi/route.ts` | OpenAPI 3.0.3 JSON 스펙 제공 |
| `src/app/docs/page.tsx` | swagger-ui-react 기반 문서 페이지 |
| `src/types/swagger-ui-react.d.ts` | swagger-ui-react 타입 선언 |

**접근 경로:** `/docs` (인증 불필요 — PUBLIC_PATHS에 포함)

---

### 2.7 시드 데이터 (20곡)

한국 교회 찬양 20곡의 메타데이터를 임베딩하여 songs_knowledge 테이블에 삽입.

**실행 방법:**
```bash
npx tsx --env-file=.env.local scripts/seed-songs.ts
```

**파일:** `scripts/seed-songs.ts`

---

### 2.8 모바일 반응형 사이드바

모바일(768px 미만)에서 사이드바가 화면을 차지하는 문제를 해결하기 위해 접이식(drawer) UI 적용.

**동작:**
- **모바일 (< 768px):** 사이드바 기본 숨김 → 헤더 왼쪽 햄버거 버튼(☰)으로 슬라이드 오픈 → 반투명 오버레이 배경 → 오버레이 터치 또는 세션 선택/새 상담 시 자동 닫힘
- **데스크톱 (≥ 768px):** 기존처럼 사이드바 항상 표시, 햄버거 버튼도 표시되지만 토글 가능

**구현:**
| 파일 | 변경 내용 |
|------|----------|
| `src/components/Sidebar.tsx` | `isOpen`/`onToggle` props 추가, fixed position + CSS transition, 오버레이 배경, 모바일 자동 닫힘 |
| `src/app/page.tsx` | `sidebarOpen` 상태 추가, Header에 `onToggleSidebar` 전달, 햄버거 메뉴 버튼 추가 |
| `src/app/globals.css` | `@media (min-width: 768px)` — 데스크톱에서 오버레이 숨김 + aside position 오버라이드 |

---

### 2.9 프로덕션 Google OAuth 배포

프로덕션 환경(Vercel)에서 Google 로그인이 작동하도록 설정.

**완료된 설정:**
| 항목 | 내용 |
|------|------|
| Google OAuth consent screen 게시 | Testing → Production (Google Cloud Console → OAuth consent screen → Publish App) |
| Supabase Site URL | `https://stlc-praise.vercel.app` 으로 변경 |
| Supabase Redirect URLs | `https://stlc-praise.vercel.app/auth/callback` 추가 |

**해결한 이슈:**
| 이슈 | 원인 | 해결 |
|------|------|------|
| "액세스 차단됨" (보안 정책 미준수) | OAuth consent screen이 "테스트" 상태 | 앱 게시(Publish)로 전환 |
| "403: disallowed-useragent" | 카카오톡 등 앱 내장 브라우저(WebView)에서 접속 | Chrome/Safari 등 일반 브라우저에서 접속 안내 |

---

## 3. 변경된 파일 구조 (Day 1 대비 추가분)

```
src/
├── app/
│   ├── globals.css           # [변경] 모바일 사이드바 미디어쿼리 추가
│   ├── page.tsx             # [변경] auth 상태, 세션 관리, 사이드바 통합, 모바일 토글
│   ├── login/page.tsx       # [추가] Google OAuth 로그인 페이지
│   ├── auth/
│   │   └── callback/route.ts # [추가] OAuth 콜백 핸들러
│   ├── docs/page.tsx        # [추가] Swagger UI 페이지
│   └── api/
│       ├── recommend/route.ts   # [변경] RAG 컨텍스트 추가
│       ├── chat/route.ts        # [변경] RAG 컨텍스트 추가
│       ├── songs/route.ts       # [추가] 곡 지식 베이스 CRUD
│       ├── openapi/route.ts     # [추가] OpenAPI 스펙
│       └── sessions/
│           ├── route.ts         # [추가] 세션 목록/생성
│           ├── title/route.ts   # [추가] AI 제목 생성
│           └── [id]/
│               ├── route.ts     # [추가] 세션 수정/삭제
│               └── messages/
│                   └── route.ts # [추가] 메시지 조회/저장
├── components/
│   └── Sidebar.tsx          # [추가] 세션 사이드바 (접이식 drawer 지원)
├── lib/
│   ├── gemini.ts            # [변경] RAG 컨텍스트 파라미터, generateTitle 추가
│   ├── rag.ts               # [추가] RAG 핵심 라이브러리
│   ├── auth.ts              # [추가] getUser/requireUser 헬퍼
│   ├── supabase-browser.ts  # [추가] 브라우저 Supabase 클라이언트
│   └── supabase-server.ts   # [추가] 서버 Supabase 클라이언트
├── proxy.ts                 # [추가] Next.js 16 인증 프록시 (middleware 대체)
├── types/
│   └── swagger-ui-react.d.ts # [추가] 타입 선언
docs/
├── supabase-rag-migration.sql   # [추가] RAG용 벡터 DB 마이그레이션
└── supabase-auth-migration.sql  # [추가] 인증 + 채팅 세션 마이그레이션
scripts/
└── seed-songs.ts                # [추가] 20곡 시드 데이터
```

---

## 4. 환경 변수 (Day 1 대비 변동 없음)

| 변수명 | 용도 |
|--------|------|
| `GEMINI_API_KEY` | Gemini AI API 키 (임베딩 + 생성 모두 사용) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 (RLS로 보호) |

> Google OAuth의 Client ID/Secret은 Supabase Auth 대시보드에서 관리 (앱 환경변수에 불필요)

---

## 5. DB 스키마 전체 (현재 상태)

| 테이블 | 용도 | RLS |
|--------|------|-----|
| `setlists` | 확정된 셋리스트 (Day 1) | 공개 읽기/쓰기 |
| `songs_knowledge` | 곡 지식 베이스 + 벡터 임베딩 | 공용(user_id NULL) + 개인(auth.uid()) |
| `chat_sessions` | 채팅 세션 메타데이터 | auth.uid() = user_id |
| `chat_messages` | 세션별 메시지 | 세션 소유자만 |

**pgvector 확장:** `vector(768)` 타입, HNSW 인덱스 (cosine distance)

---

## 6. Future Work (우선순위순)

### ~~6.1 프로덕션 배포 준비~~ (완료)
- ~~Supabase URL Configuration 설정 (Site URL + Redirect URL)~~
- ~~Google OAuth consent screen 앱 게시(Publish)~~
- 앱 내장 브라우저(WebView)에서는 Google OAuth가 차단됨 — 일반 브라우저 사용 필요

### 6.2 곡 데이터베이스 관리 UI (높음)
- 관리자 페이지에서 곡 추가/수정/삭제 UI
- 현재는 API(`/api/songs`)와 시드 스크립트로만 관리 가능
- 곡 목록 조회, 검색, 필터링 기능

### 6.3 RAG 품질 개선 (중간)
- 곡 교체 이력 수집 → 추천 품질 피드백 루프
- 임베딩 갱신 전략 (곡 메타데이터 변경 시 재임베딩)
- 시맨틱 검색 threshold(현재 0.3) 튜닝

### 6.4 악보 인라인 표시 (중간)
- Google Custom Search API 403 문제 해결 또는 대안 API (Bing, SerpAPI) 검토
- 현재는 Google 이미지 검색 팝업 방식으로 대체 중

### 6.5 셋리스트 관리 강화 (중간)
- 과거 셋리스트 목록 조회 (사용자별)
- 날짜별/절기별 필터링
- 셋리스트에 user_id 연결 (현재는 공개)

### 6.6 팀원 권한 관리 (낮음)
- 팀장/팀원 역할 분리
- 공용 곡 데이터베이스 관리 권한 (팀장만)
- 팀 단위 공유 셋리스트

### 6.7 예배 순서 통합 (낮음)
- 찬양 외 예배 순서 (기도, 말씀, 봉헌 등) 관리
- 예배 전체 흐름에 맞는 찬양 배치 추천

### 6.8 팀원 연습 도구 (낮음)
- 곡별 코드/가사 표시
- 키 변환 (Transpose) 기능
- 연습 체크리스트

---

## 7. 알려진 이슈

| 이슈 | 상태 | 비고 |
|------|------|------|
| Google Custom Search API 403 | 미해결 | Day 1에서 이어진 이슈. 팝업 방식으로 대체 중 |
| Gemini 503 간헐 발생 | 완화됨 | callWithFallback + retry로 대응 |
| ~~Google OAuth "테스트" 상태~~ | **해결** | 앱 게시(Publish) 완료 |
| ~~프로덕션 OAuth 리다이렉트 미설정~~ | **해결** | Supabase Site URL + Redirect URL 설정 완료 |
| WebView에서 Google OAuth 차단 | 알려짐 | 앱 내장 브라우저(카카오톡 등)에서 "403: disallowed-useragent" 에러. 일반 브라우저 사용 필요 |

---

## 8. 개발 환경 참고

- **Dev 서버:** `npm run dev` → http://localhost:3000 (Turbopack)
- **시드 데이터 실행:** `npx tsx --env-file=.env.local scripts/seed-songs.ts`
- **SQL 마이그레이션:** Supabase SQL Editor에서 `docs/*.sql` 파일 실행
- **Supabase 대시보드:** https://supabase.com/dashboard/project/nvdyxmveilxcfwnudvfr
- **Google Cloud Console:** OAuth consent screen 및 클라이언트 관리
