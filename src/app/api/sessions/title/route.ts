import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { generateTitle } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const { sessionId, prompt } = await request.json();

    const title = await generateTitle(prompt);
    console.log("[title] prompt:", prompt, "→ generated:", JSON.stringify(title));

    if (title) {
      const supabase = await createClient();
      await supabase
        .from("chat_sessions")
        .update({ title })
        .eq("id", sessionId)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ title });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
