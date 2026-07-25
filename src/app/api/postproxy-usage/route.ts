import { NextResponse } from "next/server";

const POSTPROXY_BASE = "https://api.postproxy.dev/api";

export async function GET() {
  try {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    // Published posts — count from Postproxy (source of truth)
    const res = await fetch(`${POSTPROXY_BASE}/posts?per_page=50`, {
      headers: { Authorization: `Bearer ${process.env.POSTPROXY_API_KEY}` },
    });

    let publishedCount = 0;
    if (res.ok) {
      const data = await res.json();
      const posts: any[] = data.data || [];
      publishedCount = posts.filter((p: any) => p.created_at >= firstOfMonth && p.source === "postproxy").length;
    }

    // Scheduled posts — count from local DB (not yet sent to Postproxy)
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { count: scheduledCount } = await (supabase
      .from("content_items") as any)
      .select("*", { count: "exact", head: true })
      .in("status", ["scheduled", "publishing"])
      .gte("scheduled_at", firstOfMonth)
      .lt("scheduled_at", startOfNextMonth);

    const totalUsed = publishedCount + (scheduledCount || 0);
    const limit = 10;

    const months = [];
    for (let i = 0; i < 3; i++) {
      const m = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        month: m.getMonth(),
        year: m.getFullYear(),
        label: m.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      });
    }

    return NextResponse.json({
      used: totalUsed,
      limit,
      remaining: Math.max(0, limit - totalUsed),
      postproxyUsed: publishedCount,
      scheduledCount: scheduledCount || 0,
      month: now.getMonth(),
      year: now.getFullYear(),
      resetDate: startOfNextMonth,
      nextResetDate: startOfNextMonth,
      months,
    });
  } catch {
    return NextResponse.json({ used: 0, limit: 10, remaining: 10, postproxyUsed: 0, scheduledCount: 0 });
  }
}
