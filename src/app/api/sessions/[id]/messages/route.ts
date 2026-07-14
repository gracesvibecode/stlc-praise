import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { requireUser } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, role, content, songs_json, created_at")
      .eq("session_id", id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ messages: data });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        session_id: id,
        role: body.role,
        content: body.content,
        songs_json: body.songs_json ?? null,
      })
      .select("id, role, content, songs_json, created_at")
      .single();

    if (error) throw error;

    await supabase
      .from("chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
