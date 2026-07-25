import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/db";
import { publishToSocial } from "@/lib/publisher";

const POSTPROXY_BASE = "https://api.postproxy.dev/api";

export async function POST(req: Request) {
  try {
    const { contentId, profileIds: rawProfileIds } = await req.json();

    if (!contentId) {
      return NextResponse.json({ error: "contentId required" }, { status: 400 });
    }

    const supabase = getServerSupabase();

    const { data: content, error: fetchError } = await (supabase
      .from("content_items") as any)
      .select("*")
      .eq("id", contentId)
      .single();

    if (fetchError || !content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    await (supabase
      .from("content_items") as any)
      .update({ status: "publishing" })
      .eq("id", contentId);

    try {
      const mediaUrls: string[] = [];
      if (content.image_url) mediaUrls.push(content.image_url);
      if (content.video_url) mediaUrls.push(content.video_url);

      let profileIds = rawProfileIds || (process.env.POSTPROXY_PROFILE_IDS || "").split(",");

      const profilesRes = await fetch(`${POSTPROXY_BASE}/profiles`, {
        headers: { Authorization: `Bearer ${process.env.POSTPROXY_API_KEY}` },
      });
      const profilesData = profilesRes.ok ? await profilesRes.json() : null;
      const profilesList: any[] = profilesData ? (Array.isArray(profilesData) ? profilesData : profilesData.profiles || profilesData.data || []) : [];

      const profileByPlatform = new Map(profilesList.map((p: any) => [p.platform?.toLowerCase(), p]));
      const skipped: string[] = [];

      const bodyWithHashtags = `${content.body || ""}${content.hashtags ? `\n\n${content.hashtags}` : ""}`;

      profileIds = profileIds.filter((pid: string) => {
        const profile = profilesList.find((p: any) => p.id === pid || p.platform?.toLowerCase() === pid.toLowerCase());
        if (!profile) return true;
        const plat = profile.platform?.toLowerCase();

        if (plat === "instagram" && mediaUrls.length === 0) {
          skipped.push("Instagram (requires media)");
          return false;
        }
        if (plat === "threads" && bodyWithHashtags.length > 500) {
          skipped.push("Threads (500 char limit)");
          return false;
        }
        return true;
      });

      if (profileIds.length === 0) {
        return NextResponse.json({ error: "No compatible platforms for this content. Instagram requires media, Threads has a 500 char limit." }, { status: 400 });
      }

      const result = await publishToSocial({
        profileIds,
        body: bodyWithHashtags,
        mediaUrls,
      });

      await (supabase
        .from("content_items") as any)
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          postproxy_post_id: result.postId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contentId);

      return NextResponse.json({
        success: true,
        postId: result.postId,
        ...(skipped.length ? { skipped: `Skipped: ${skipped.join(", ")}` } : {}),
      });
    } catch (err: any) {
      await (supabase
        .from("content_items") as any)
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", contentId);

      throw new Error(err?.message || "Publish failed");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
