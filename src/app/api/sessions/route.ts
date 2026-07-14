import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ sessions: data });
  } catch {
    return NextResponse.json({ sessions: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    const body = await request.json().catch(() => ({}));

    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: user.id,
        title: body.title || "새 상담",
      })
      .select("id, title, created_at, updated_at")
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
