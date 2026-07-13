"use client";

export interface Song {
  id: string;
  title: string;
  composer: string;
  key: string;
  bpm: number;
  tempo: string;
  styles: string[];
  reason: string;
}

interface SongCardProps {
  song: Song;
  index: number;
  onSwapRequest?: (index: number) => void;
  isConfirmed?: boolean;
}

export default function SongCard({ song, index, onSwapRequest, isConfirmed }: SongCardProps) {
  const handleSheetMusic = () => {
    const query = encodeURIComponent(`${song.title} 악보`);
    const url = `https://www.google.com/search?q=${query}&tbm=isch`;
    window.open(url, "sheetMusic", "width=900,height=700,scrollbars=yes,resizable=yes");
  };

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary-50 text-primary text-sm font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-text truncate">{song.title}</h3>
            <p className="text-sm text-text-secondary mt-0.5">{song.composer}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleSheetMusic}
            className="text-xs px-2.5 py-1 rounded-lg border border-border text-text-muted hover:border-primary hover:text-primary transition-colors"
          >
            악보 보기
          </button>
          {!isConfirmed && onSwapRequest && (
            <button
              onClick={() => onSwapRequest(index)}
              className="text-xs px-2.5 py-1 rounded-lg border border-border text-text-muted hover:border-accent hover:text-accent transition-colors"
            >
              교체
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        <span className="px-2 py-0.5 text-xs rounded-md bg-primary-50 text-primary font-medium">
          {song.key}
        </span>
        <span className="px-2 py-0.5 text-xs rounded-md bg-primary-50 text-primary font-medium">
          {song.bpm} BPM · {song.tempo}
        </span>
        {song.styles.map((style) => (
          <span
            key={style}
            className="px-2 py-0.5 text-xs rounded-md border border-border text-text-muted"
          >
            {style}
          </span>
        ))}
      </div>

      <p className="mt-3 text-sm text-text-secondary leading-relaxed">
        {song.reason}
      </p>
    </div>
  );
}
