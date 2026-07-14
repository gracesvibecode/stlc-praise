import { NextRequest, NextResponse } from "next/server";
import { addSong, type SongKnowledge } from "@/lib/rag";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("songs_knowledge")
    .select("id, title, composer, key, bpm, tempo, styles, themes, seasons, notes, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ songs: data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const songs: SongKnowledge[] = Array.isArray(body) ? body : [body];

  if (!songs.length || songs.some((s) => !s.title || !s.composer)) {
    return NextResponse.json(
      { error: "각 곡에 title과 composer가 필요합니다." },
      { status: 400 }
    );
  }

  const results = [];
  const errors = [];

  for (const song of songs) {
    try {
      const result = await addSong(song);
      results.push({ ...result, title: song.title });
    } catch (e: unknown) {
      errors.push({ title: song.title, error: (e as Error).message });
    }
  }

  return NextResponse.json({ added: results, errors });
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });
  }

  const { error } = await supabase
    .from("songs_knowledge")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: id });
}
