import { NextRequest, NextResponse } from "next/server";
import { chatSwap } from "@/lib/gemini";
import { searchSongs, formatRAGContext } from "@/lib/rag";
import { getUser } from "@/lib/auth";

export const maxDuration = 60;

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
  const { currentSongs, message } = await request.json();

  if (!currentSongs?.length || !message) {
    return NextResponse.json(
      { error: "currentSongs와 message가 필요합니다." },
      { status: 400 }
    );
  }

  try {
    let ragContext = "";
    try {
      const user = await getUser();
      const relevant = await searchSongs(message, 10, 0.3, user?.id);
      ragContext = formatRAGContext(relevant);
    } catch {
      // RAG 검색 실패 시 컨텍스트 없이 진행
    }

    const result = await withRetry(() => chatSwap(currentSongs, message, ragContext));
    return NextResponse.json(result);
  } catch (e: unknown) {
    const status = (e as { status?: number }).status;
    console.error("Gemini chat error:", e);
    if (status === 429) {
      return NextResponse.json(
        { error: "요청이 너무 빈번합니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "응답 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
