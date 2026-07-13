import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const { prompt, songs } = await request.json();

  if (!prompt || !songs?.length) {
    return NextResponse.json(
      { error: "prompt과 songs가 필요합니다." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("setlists")
    .insert({ prompt, songs })
    .select("id")
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json(
      { error: "저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id });
}
