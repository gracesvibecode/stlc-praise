# STLC 찬양 선곡 도우미 — 개발 기록

**날짜:** 2026년 7월 13일  
**배포 URL:** https://stlc-praise.vercel.app  
**GitHub:** https://github.com/gracesvibecode/stlc-praise

---

## 1. 프로젝트 개요

STLC (Sydney The Lord's Church) 찬양팀을 위한 AI 기반 찬양 선곡 도우미 커뮤니티 홈페이지.  
예배 주제/절기/분위기를 입력하면 AI가 찬양곡을 추천하고, 채팅으로 곡을 교체한 뒤 최종 셋리스트를 저장·공유할 수 있다.

---

## 2. 완료된 기능

### 2.1 AI 찬양곡 추천
- 프롬프트 기반 텍스트 입력 (예배 주제, 절기, 템포/스타일)
- 추천곡 수 선택 (3~8곡, pill 버튼)
- 예시 프롬프트 4개 (칩 버튼으로 빠른 입력)
- Gemini Flash 모델로 구조화된 JSON 응답 (title, composer, key, bpm, tempo, styles, reason)

### 2.2 채팅 기반 곡 교체
- 3가지 액션 타입 지원:
  - `swap`: 특정 곡 교체 (교체 버튼 또는 채팅)
  - `recommend`: 완전히 새로운 곡 목록 추천
  - `chat`: 일반 대화 응답
- 현재 선곡 목록을 컨텍스트로 전달하여 중복 방지

### 2.3 셋리스트 저장 및 공유
- 확정 버튼 → Supabase에 prompt + songs JSON 저장
- 고유 UUID 기반 공유 URL 생성 (`/setlist/[id]`)
- 복사 버튼 → 클립보드 복사 + "복사됨" 피드백 (2초)
- 공유 페이지: 서버 컴포넌트로 SEO 지원, 날짜/프롬프트/곡 목록 표시

### 2.4 악보 검색
- 각 곡 카드에 "악보 보기" 버튼
- 클릭 시 Google 이미지 검색 팝업 (900x700) 열림
- 같은 창 이름 사용으로 여러 곡 검색 시 하나의 팝업에서 갱신

### 2.5 UI/UX
- 상태 머신: `welcome` → `chat` → `confirmed`
- 인디고 블루(#4355B0) 기반 디자인 토큰 시스템
- 다크모드 지원 (`prefers-color-scheme` + `data-theme` 오버라이드)
- Pretendard Variable 한국어 폰트 (로컬 woff2)
- 채팅 UI: 사용자(우측, 프라이머리 배경) / AI(좌측, 카드 배경 + 음표 아이콘)
- 로딩 애니메이션 (바운스 도트)
- 반응형 레이아웃 (max-w-3xl 중앙 정렬)

### 2.6 배포
- Vercel 자동 배포 (GitHub main 브랜치 연동)
- 환경변수 Vercel Dashboard에서 설정

---

## 3. 주요 기술적 결정 및 해결 과정

### 3.1 Gemini 모델 선택
| 시도 | 결과 |
|------|------|
| gemini-2.0-flash | 할당량 0/0, 신규 사용자 사용 불가 |
| gemini-2.5-flash | 404, 신규 사용자 사용 불가 |
| gemini-3.5-flash | 작동함 (간헐적 503) |
| gemini-3.1-flash-lite | 폴백 모델로 사용 |

**최종 구현:** 모델 폴백 시스템 — `gemini-3.5-flash` 우선 → 503/429 시 `gemini-3.1-flash-lite`로 자동 전환. API 라우트에서도 `withRetry` (최대 2회, 3초 간격) 적용.

### 3.2 구조화된 AI 응답
- `responseMimeType: "application/json"` + `responseSchema`로 Gemini에서 직접 JSON 출력
- 초기에는 평문 텍스트 응답 → 형식 불일치 문제 발생 → 스키마 기반으로 전환하여 해결

### 3.3 채팅 액션 타입 분기
- 초기: swap만 지원 → 새 추천 요청 시 텍스트로만 응답되는 문제
- 해결: 3가지 액션 타입(swap/recommend/chat) 스키마 설계, `processChatResponse()` 헬퍼 함수로 분기 처리

### 3.4 Next.js 16 호환성
- `PageProps` 타입이 제거됨 → `{ params: Promise<{ id: string }> }` 인라인 타입 사용
- params가 Promise 기반으로 변경 → `await params` 필요

### 3.5 악보 검색 (미완료 → 대안 적용)
- Google Custom Search JSON API 403 에러가 해결되지 않음
- 프로젝트 생성, API 활성화, 결제 연결, API 키 생성 모두 완료했으나 "This project does not have the access to Custom Search JSON API" 지속
- 새 프로젝트(stlc-search)에서도 동일 에러 → 계정 레벨 제한으로 추정
- **대안:** Google 이미지 검색 팝업 방식으로 전환

---

## 4. 파일 구조

```
src/
├── app/
│   ├── globals.css          # 디자인 토큰 (CSS 변수) + Tailwind v4 설정
│   ├── layout.tsx           # 루트 레이아웃 (Pretendard 폰트, 메타데이터)
│   ├── page.tsx             # 메인 페이지 (상태 머신, 채팅 로직)
│   ├── api/
│   │   ├── recommend/route.ts   # AI 추천 API (POST)
│   │   ├── chat/route.ts        # 채팅/교체 API (POST)
│   │   ├── setlist/route.ts     # 셋리스트 저장 API (POST)
│   │   └── sheet-music/route.ts # 악보 검색 API (GET) — 현재 미사용
│   └── setlist/
│       └── [id]/page.tsx        # 공유 셋리스트 페이지 (서버 컴포넌트)
├── components/
│   ├── WelcomeScreen.tsx    # 시작 화면 (프롬프트 입력, 예시 칩, 곡 수 선택)
│   ├── ChatMessage.tsx      # 채팅 메시지 버블
│   ├── ChatInput.tsx        # 채팅 입력 필드
│   └── SongCard.tsx         # 곡 카드 (악보 보기, 교체 버튼)
├── lib/
│   ├── gemini.ts            # Gemini AI 연동 (폴백, 스키마, 시스템 프롬프트)
│   └── supabase.ts          # Supabase 클라이언트
└── fonts/
    └── PretendardVariable.woff2  # 한국어 폰트
```

---

## 5. 환경 변수

| 변수명 | 용도 | 위치 |
|--------|------|------|
| `GEMINI_API_KEY` | Gemini Flash AI API 키 (AQ... 형식) | Vercel + .env.local |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Vercel + .env.local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | Vercel + .env.local |
| `GOOGLE_SEARCH_CX` | Google 검색엔진 ID (현재 미사용) | .env.local |
| `GOOGLE_SEARCH_API_KEY` | Google Cloud API 키 (현재 미사용) | .env.local |

---

## 6. Supabase 데이터베이스

### setlists 테이블

```sql
create table setlists (
  id text primary key default gen_random_uuid()::text,
  prompt text not null,
  songs jsonb not null,
  created_at timestamptz default now()
);

alter table setlists enable row level security;
create policy "Anyone can read setlists" on setlists for select using (true);
create policy "Anyone can insert setlists" on setlists for insert with check (true);
```

- **Region:** Asia Pacific (Sydney)
- **URL:** https://nvdyxmveilxcfwnudvfr.supabase.co

---

## 7. Future Work (우선순위순)

### 7.1 악보 인라인 표시 (높음)
- Google Custom Search JSON API 403 문제 해결 시 인라인 악보 이미지 표시로 전환
- `src/app/api/sheet-music/route.ts`와 SongCard의 인라인 이미지 코드가 이미 작성되어 있음
- 대안: 다른 이미지 검색 API (Bing Image Search, SerpAPI 등) 검토

### 7.2 RAG 피드백 루프 (높음)
- 곡 변경 이력 수집 (어떤 곡이 교체되었는지, 어떤 곡으로 교체되었는지)
- 벡터 DB에 교체 패턴 저장 → 추천 품질 지속적 개선
- 예: "부활절 + 빠른 템포" 요청 시 과거 교체 패턴을 반영한 추천

### 7.3 사용자 인증 (중간)
- 팀원별 로그인 (Supabase Auth)
- 개인별 선곡 히스토리
- 권한 관리 (팀장/팀원)

### 7.4 셋리스트 관리 (중간)
- 과거 셋리스트 목록 조회
- 날짜별/절기별 필터링
- 셋리스트 수정/삭제

### 7.5 곡 데이터베이스 구축 (중간)
- 자주 사용하는 곡을 DB에 축적
- AI 추천 시 DB의 곡 우선 추천
- 곡별 키/BPM 사용 통계

### 7.6 예배 순서 통합 (낮음)
- 찬양 외 예배 순서 (기도, 말씀, 봉헌 등) 관리
- 예배 전체 흐름에 맞는 찬양 배치 추천

### 7.7 팀원 연습 도구 (낮음)
- 곡별 코드/가사 표시
- 키 변환 (Transpose) 기능
- 연습 체크리스트

---

## 8. 알려진 이슈

| 이슈 | 상태 | 비고 |
|------|------|------|
| Google Custom Search API 403 | 미해결 | 두 프로젝트(stlc-praise, stlc-search) 모두 동일 에러. 계정 레벨 제한 추정 |
| Gemini 503 간헐 발생 | 완화됨 | 모델 폴백 + retry로 대응. 피크 시간대에 발생 가능 |
| 악보 팝업이 브라우저에 의해 차단될 수 있음 | 알려짐 | 사용자가 팝업 허용 필요 |

---

## 9. 개발 환경 참고

- **Node.js**: 로컬 환경에서 실행
- **패키지 매니저**: npm
- **Dev 서버**: `npm run dev` → http://localhost:3000 (Turbopack)
- **GitHub 계정**: gracesvibecode
- **Vercel 계정**: GitHub 연동
- **Supabase 프로젝트 대시보드**: https://supabase.com/dashboard/project/nvdyxmveilxcfwnudvfr
