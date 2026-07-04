import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const status = searchParams.get("status");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const supabase = getServerSupabase();
    let query = (supabase
      .from("content_items") as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (status) {
      const statuses = status.split(",");
      if (statuses.length === 1) {
        query = query.eq("status", statuses[0]);
      } else {
        query = query.in("status", statuses);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getServerSupabase();
    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

    const { data, error } = await (supabase
      .from("content_items") as any)
      .insert({
        user_id: body.userId,
        platform: body.platforms || body.platform || "all",
        content_type: body.contentType || "post",
        status: body.status || "draft",
        topic: body.topic,
        body: body.body,
        headline: body.headline || null,
        image_url: body.imageUrl,
        video_url: body.videoUrl,
        hashtags: body.hashtags,
        scheduled_at: body.scheduledAt || null,
        ai_model: body.aiModel,
      })
      .select()
      .single();

    if (error) {
      console.error("[content POST] Supabase error:", JSON.stringify(error));
      throw error;
    }
    return NextResponse.json(data);
  } catch (err: any) {
    const message = err?.message || err?.details || "Failed to create content";
    console.error("[content POST] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
