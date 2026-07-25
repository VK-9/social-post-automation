import { createClient } from "@supabase/supabase-js";
import { publishToSocial } from "@/lib/publisher";
import { cleanupStorage } from "@/lib/storage-cleanup";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

let intervalId: ReturnType<typeof setInterval> | null = null;
let lastCleanupDay = -1;

export function startScheduler() {
  if (intervalId) return;
  intervalId = setInterval(tick, 30_000);
}

export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

async function tick() {
  await checkAndPublish();
  await checkCleanup();
}

async function checkCleanup() {
  const today = new Date().getDate();
  if (today === lastCleanupDay) return;
  lastCleanupDay = today;
  const result = await cleanupStorage();
  if (result.deleted > 0 || result.errors.length > 0) {
    console.log(`Storage cleanup: deleted ${result.deleted} file(s)${result.errors.length ? `, ${result.errors.length} error(s)` : ""}`);
  }
}

async function checkAndPublish() {
  try {
    const now = new Date().toISOString();

    const { data: due, error } = await supabase
      .from("content_items")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now)
      .is("postproxy_post_id", null);

    if (error || !due) return;

    for (const post of due) {
      await supabase
        .from("content_items")
        .update({ status: "publishing" })
        .eq("id", post.id);

      try {
        const profileIds = (process.env.POSTPROXY_PROFILE_IDS || "").split(",");

        const mediaUrls: string[] = [];
        if (post.image_url) mediaUrls.push(post.image_url);
        if (post.video_url) mediaUrls.push(post.video_url);

        const result = await publishToSocial({
          profileIds,
          body: `${post.body}\n\n${post.hashtags}`,
          mediaUrls,
        });

        await supabase
          .from("content_items")
          .update({
            status: "published",
            published_at: new Date().toISOString(),
            postproxy_post_id: result.postId,
          })
          .eq("id", post.id);
      } catch {
        await supabase
          .from("content_items")
          .update({ status: "failed" })
          .eq("id", post.id);
      }
    }
  } catch (err) {
    console.error("Scheduler error:", err);
  }
}
