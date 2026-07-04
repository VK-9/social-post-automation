import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/db";
import { publishToSocial } from "@/lib/publisher";

export async function POST(req: Request) {
  try {
    const { contentId, profileGroupId, profileIds } = await req.json();

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

      const result = await publishToSocial({
        profileGroupId: profileGroupId || process.env.POSTPROXY_PROFILE_GROUP_ID || "",
        profileIds: profileIds || (process.env.POSTPROXY_PROFILE_IDS || "").split(","),
        body: `${content.body}\n\n${content.hashtags}`,
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

      return NextResponse.json({ success: true, postId: result.postId });
    } catch {
      await (supabase
        .from("content_items") as any)
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", contentId);

      throw new Error("Publish failed");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
