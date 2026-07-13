import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get("title");

  if (!title) {
    return NextResponse.json({ error: "title이 필요합니다." }, { status: 400 });
  }

  const cx = process.env.GOOGLE_SEARCH_CX;
  const key = process.env.GOOGLE_SEARCH_API_KEY;

  if (!cx || !key) {
    return NextResponse.json({ images: [] });
  }

  try {
    const q = encodeURIComponent(`${title} 찬양 악보`);
    const res = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${q}&searchType=image&num=3`
    );
    const data = await res.json();

    if (!data.items) {
      return NextResponse.json({ images: [] });
    }

    const images = data.items.map((item: { link: string; title: string; image?: { contextLink?: string } }) => ({
      url: item.link,
      title: item.title,
      sourceUrl: item.image?.contextLink ?? "",
    }));

    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ images: [] });
  }
}
