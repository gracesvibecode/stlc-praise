-- STLC 찬양 선곡 도우미 — 인증 + 채팅 세션 마이그레이션
-- Supabase SQL Editor에서 실행하세요

-- 1. 채팅 세션 테이블
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '새 상담',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_chat_sessions_user on chat_sessions(user_id, updated_at desc);

-- 2. 채팅 메시지 테이블
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  songs_json jsonb,
  created_at timestamptz default now()
);

create index idx_chat_messages_session on chat_messages(session_id, created_at);

-- 3. songs_knowledge에 user_id 추가 (null = 공용, 값 = 개인)
alter table songs_knowledge add column if not exists user_id uuid references auth.users(id) on delete cascade;
create index if not exists idx_songs_knowledge_user on songs_knowledge(user_id);

-- 4. RLS 정책 — chat_sessions
alter table chat_sessions enable row level security;
create policy "Users can read own sessions"
  on chat_sessions for select using (auth.uid() = user_id);
create policy "Users can create own sessions"
  on chat_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions"
  on chat_sessions for update using (auth.uid() = user_id);
create policy "Users can delete own sessions"
  on chat_sessions for delete using (auth.uid() = user_id);

-- 5. RLS 정책 — chat_messages (세션 소유자만)
alter table chat_messages enable row level security;
create policy "Users can read own messages"
  on chat_messages for select using (
    session_id in (select id from chat_sessions where user_id = auth.uid())
  );
create policy "Users can create own messages"
  on chat_messages for insert with check (
    session_id in (select id from chat_sessions where user_id = auth.uid())
  );

-- 6. songs_knowledge RLS 업데이트 (공용 + 개인 데이터)
drop policy if exists "Anyone can read songs" on songs_knowledge;
drop policy if exists "Anyone can insert songs" on songs_knowledge;
drop policy if exists "Anyone can update songs" on songs_knowledge;
drop policy if exists "Anyone can delete songs" on songs_knowledge;

create policy "Users can read shared and own songs"
  on songs_knowledge for select using (user_id is null or user_id = auth.uid());
create policy "Users can insert own songs"
  on songs_knowledge for insert with check (user_id = auth.uid());
create policy "Users can update own songs"
  on songs_knowledge for update using (user_id = auth.uid());
create policy "Users can delete own songs"
  on songs_knowledge for delete using (user_id = auth.uid());

-- 7. match_songs 함수 업데이트 (user_id 필터 추가)
create or replace function match_songs(
  query_embedding vector(768),
  match_threshold float default 0.3,
  match_count int default 10,
  filter_user_id uuid default null
)
returns table (
  id uuid,
  title text,
  composer text,
  key text,
  bpm integer,
  tempo text,
  styles text[],
  themes text[],
  seasons text[],
  notes text,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    sk.id,
    sk.title,
    sk.composer,
    sk.key,
    sk.bpm,
    sk.tempo,
    sk.styles,
    sk.themes,
    sk.seasons,
    sk.notes,
    sk.content,
    1 - (sk.embedding <=> query_embedding) as similarity
  from songs_knowledge sk
  where 1 - (sk.embedding <=> query_embedding) > match_threshold
    and (sk.user_id is null or sk.user_id = filter_user_id)
  order by sk.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 8. updated_at 자동 갱신 트리거
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger chat_sessions_updated_at
  before update on chat_sessions
  for each row execute function update_updated_at();
