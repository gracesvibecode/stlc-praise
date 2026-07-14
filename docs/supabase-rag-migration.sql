-- STLC 찬양 선곡 도우미 — RAG용 벡터 DB 마이그레이션
-- Supabase SQL Editor에서 실행하세요

-- 1. pgvector 확장 활성화
create extension if not exists vector with schema extensions;

-- 2. 기존 테이블이 있으면 삭제 (재실행 시 안전)
drop function if exists match_songs;
drop table if exists songs_knowledge;

-- 3. 곡 지식 베이스 테이블 (gemini-embedding-2 = 3072차원)
create table songs_knowledge (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  composer text not null,
  key text,
  bpm integer,
  tempo text check (tempo in ('느리게', '보통', '빠르게')),
  styles text[] default '{}',
  themes text[] default '{}',
  seasons text[] default '{}',
  notes text default '',
  content text not null,
  embedding vector(768),
  created_at timestamptz default now()
);

-- 4. 벡터 유사도 검색 함수 (cosine distance)
create or replace function match_songs(
  query_embedding vector(768),
  match_threshold float default 0.3,
  match_count int default 10
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
  order by sk.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 5. 벡터 인덱스 (HNSW — 고차원에서 IVFFlat보다 효율적)
create index on songs_knowledge
  using hnsw (embedding vector_cosine_ops);

-- 6. RLS 정책
alter table songs_knowledge enable row level security;
create policy "Anyone can read songs" on songs_knowledge for select using (true);
create policy "Anyone can insert songs" on songs_knowledge for insert with check (true);
create policy "Anyone can update songs" on songs_knowledge for update using (true);
create policy "Anyone can delete songs" on songs_knowledge for delete using (true);
