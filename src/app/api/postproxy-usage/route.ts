import { NextResponse } from "next/server";

const POSTPROXY_API_KEY = process.env.POSTPROXY_API_KEY;
const POSTPROXY_BASE = "https://api.postproxy.dev/v1";

export async function GET() {
  try {
    const res = await fetch(`${POSTPROXY_BASE}/profile-groups`, {
      headers: { Authorization: `Bearer ${POSTPROXY_API_KEY}` },
    });

    let postproxyUsed = 0;
    let postproxyLimit = 10;

    if (res.ok) {
      const data = await res.json();
      const groups = Array.isArray(data) ? data : data.profile_groups || data.data || [];
      postproxyUsed = groups.reduce((sum: number, g: any) => sum + (g.post_count || g.usage || 0), 0);
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    const { count: scheduledCount } = await (supabase
      .from("content_items") as any)
      .select("*", { count: "exact", head: true })
      .in("status", ["scheduled", "publishing"])
      .gte("scheduled_at", firstOfMonth)
      .lt("scheduled_at", startOfNextMonth);

    const totalUsed = postproxyUsed + (scheduledCount || 0);

    const months = [];
    for (let i = 0; i < 3; i++) {
      const m = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        month: m.getMonth(),
        year: m.getFullYear(),
        label: m.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      });
    }

    const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return NextResponse.json({
      used: totalUsed,
      limit: postproxyLimit,
      remaining: Math.max(0, postproxyLimit - totalUsed),
      postproxyUsed,
      scheduledCount: scheduledCount || 0,
      month: now.getMonth(),
      year: now.getFullYear(),
      resetDate: startOfNextMonth,
      nextResetDate: nextResetDate.toISOString(),
      months,
    });
  } catch {
    return NextResponse.json({ used: 0, limit: 10, remaining: 10, postproxyUsed: 0, scheduledCount: 0 });
  }
}
