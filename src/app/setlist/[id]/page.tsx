import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import SongCard, { type Song } from "@/components/SongCard";

export default async function SetlistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data } = await supabase
    .from("setlists")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) notFound();

  const songs = (data.songs as Song[]).map((s, i) => ({
    ...s,
    id: s.id || String(i),
  }));
  const createdAt = new Date(data.created_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-bg/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex items-center gap-2 px-4 h-14">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
          <span className="font-semibold text-sm text-text">STLC 찬양</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-text">찬양 셋리스트</h1>
          <p className="text-sm text-text-muted">{createdAt}</p>
        </div>

        <div className="rounded-xl border border-border bg-bg-card p-4">
          <p className="text-sm text-text-secondary">{data.prompt}</p>
        </div>

        <div className="space-y-3">
          {songs.map((song, i) => (
            <SongCard key={song.id} song={song} index={i} isConfirmed />
          ))}
        </div>
      </main>
    </div>
  );
}
