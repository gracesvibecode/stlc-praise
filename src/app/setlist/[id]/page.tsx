import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

interface Song {
  title: string;
  composer: string;
  key: string;
  bpm: number;
  tempo: string;
  styles: string[];
  reason: string;
}

export default async function SetlistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data } = await supabase
    .from("setlists")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) notFound();

  const songs = data.songs as Song[];
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
          {songs.map((song: Song, i: number) => (
            <div key={i} className="rounded-xl border border-border bg-bg-card p-4">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary-50 text-primary text-sm font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-text">{song.title}</h3>
                  <p className="text-sm text-text-secondary mt-0.5">{song.composer}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="px-2 py-0.5 text-xs rounded-md bg-primary-50 text-primary font-medium">{song.key}</span>
                <span className="px-2 py-0.5 text-xs rounded-md bg-primary-50 text-primary font-medium">{song.bpm} BPM · {song.tempo}</span>
                {song.styles.map((style: string) => (
                  <span key={style} className="px-2 py-0.5 text-xs rounded-md border border-border text-text-muted">{style}</span>
                ))}
              </div>
              <p className="mt-3 text-sm text-text-secondary leading-relaxed">{song.reason}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
