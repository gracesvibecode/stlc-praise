import { NextRequest, NextResponse } from "next/server";
import { recommendSongs } from "@/lib/gemini";

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e: unknown) {
      const status = (e as { status?: number }).status;
      if ((status === 429 || status === 503) && i < retries) {
        await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
        continue;
      }
      throw e;
    }
  }
  throw new Error("unreachable");
}

export async function POST(request: NextRequest) {
  const { prompt, songCount } = await request.json();

  if (!prompt || !songCount || songCount < 3 || songCount > 8) {
    return NextResponse.json(
      { error: "prompt과 songCount(3-8)가 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const result = await withRetry(() => recommendSongs(prompt, songCount));
    const songs = result.songs.map(
      (s: Record<string, unknown>, i: number) => ({
        id: String(i + 1),
        ...s,
      })
    );
    return NextResponse.json({ songs });
  } catch (e: unknown) {
    const status = (e as { status?: number }).status;
    console.error("Gemini recommend error:", e);
    if (status === 429) {
      return NextResponse.json(
        { error: "요청이 너무 빈번합니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "추천 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
