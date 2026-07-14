import { GoogleGenAI } from "@google/genai";
import { supabase } from "./supabase";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const EMBEDDING_MODEL = "gemini-embedding-2";

export interface SongKnowledge {
  id?: string;
  title: string;
  composer: string;
  key?: string;
  bpm?: number;
  tempo?: string;
  styles?: string[];
  themes?: string[];
  seasons?: string[];
  notes?: string;
  content?: string;
  similarity?: number;
}

export function buildContent(song: SongKnowledge): string {
  const parts: string[] = [];
  parts.push(`제목: ${song.title}`);
  parts.push(`작곡/아티스트: ${song.composer}`);
  if (song.key) parts.push(`키: ${song.key}`);
  if (song.bpm) parts.push(`BPM: ${song.bpm}`);
  if (song.tempo) parts.push(`템포: ${song.tempo}`);
  if (song.styles?.length) parts.push(`스타일: ${song.styles.join(", ")}`);
  if (song.themes?.length) parts.push(`주제: ${song.themes.join(", ")}`);
  if (song.seasons?.length) parts.push(`절기: ${song.seasons.join(", ")}`);
  if (song.notes) parts.push(`메모: ${song.notes}`);
  return parts.join(". ");
}

export async function embedText(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [text],
    config: { outputDimensionality: 768 },
  });
  return response.embeddings?.[0]?.values ?? [];
}

export async function addSong(song: SongKnowledge) {
  const content = song.content || buildContent(song);
  const embedding = await embedText(content);

  const { data, error } = await supabase
    .from("songs_knowledge")
    .insert({
      title: song.title,
      composer: song.composer,
      key: song.key ?? null,
      bpm: song.bpm ?? null,
      tempo: song.tempo ?? null,
      styles: song.styles ?? [],
      themes: song.themes ?? [],
      seasons: song.seasons ?? [],
      notes: song.notes ?? "",
      content,
      embedding: JSON.stringify(embedding),
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function searchSongs(
  query: string,
  limit = 10,
  threshold = 0.3,
  userId?: string
): Promise<SongKnowledge[]> {
  const embedding = await embedText(query);

  const { data, error } = await supabase.rpc("match_songs", {
    query_embedding: JSON.stringify(embedding),
    match_threshold: threshold,
    match_count: limit,
    filter_user_id: userId ?? null,
  });

  if (error) throw error;
  return (data ?? []) as SongKnowledge[];
}

export function formatRAGContext(songs: SongKnowledge[]): string {
  if (!songs.length) return "";

  const lines = songs.map((s, i) => {
    const parts: string[] = [`${i + 1}. "${s.title}" — ${s.composer}`];
    if (s.key) parts.push(`키: ${s.key}`);
    if (s.bpm) parts.push(`BPM: ${s.bpm}`);
    if (s.tempo) parts.push(`템포: ${s.tempo}`);
    if (s.styles?.length) parts.push(`스타일: ${s.styles.join(", ")}`);
    if (s.themes?.length) parts.push(`주제: ${s.themes.join(", ")}`);
    if (s.seasons?.length) parts.push(`절기: ${s.seasons.join(", ")}`);
    if (s.notes) parts.push(`참고: ${s.notes}`);
    return parts.join(" | ");
  });

  return `\n\n[참고 곡 데이터베이스]\n아래는 우리 찬양팀이 등록한 곡 정보입니다. 추천 시 이 곡들을 우선적으로 고려하되, 요청에 맞지 않으면 다른 곡도 추천할 수 있습니다.\n${lines.join("\n")}`;
}
