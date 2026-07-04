import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { contentId, scheduledAt } = await req.json();

    if (!contentId || !scheduledAt) {
      return NextResponse.json({ error: "contentId and scheduledAt required" }, { status: 400 });
    }

    const supabase = getServerSupabase();

    const { data, error } = await (supabase
      .from("content_items") as any)
      .update({
        status: "scheduled",
        scheduled_at: scheduledAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contentId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Failed to schedule" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const supabase = getServerSupabase();
    let query = (supabase
      .from("content_items") as any)
      .select("*")
      .eq("user_id", userId)
      .eq("status", "scheduled");

    if (start && end) {
      query = query.gte("scheduled_at", start).lte("scheduled_at", end);
    }

    const { data, error } = await query.order("scheduled_at", { ascending: true });
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
  }
}
