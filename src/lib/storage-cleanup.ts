import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BUCKET = "post-media";

export async function cleanupStorage(): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;

  const allFiles = await listAllFiles();
  if (allFiles.length === 0) return { deleted: 0, errors: [] };

  const usedFilenames = await getUsedFilenames();

  const orphaned = allFiles.filter((f) => !usedFilenames.has(f.name));

  if (orphaned.length === 0) return { deleted: 0, errors: [] };

  const batchSize = 100;
  for (let i = 0; i < orphaned.length; i += batchSize) {
    const batch = orphaned.slice(i, i + batchSize).map((f) => f.name);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) {
      errors.push(`Failed to remove batch: ${error.message}`);
    } else {
      deleted += batch.length;
    }
  }

  return { deleted, errors };
}

async function listAllFiles(): Promise<{ name: string }[]> {
  const files: { name: string }[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list("", { limit, offset, sortBy: { column: "name", order: "asc" } });

    if (error) break;
    if (!data || data.length === 0) break;

    for (const item of data) {
      if (item.metadata) files.push({ name: item.name });
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return files;
}

async function getUsedFilenames(): Promise<Set<string>> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString();

  const { data, error } = await (supabase
    .from("content_items") as any)
    .select("image_url, video_url, status, published_at");

  if (error) return new Set();

  const used = new Set<string>();

  for (const row of data) {
    const isPublishedOld = row.status === "published" && row.published_at && row.published_at < cutoff;
    if (isPublishedOld) continue;

    if (row.image_url) {
      const match = row.image_url.match(/\/post-media\/(.+)$/);
      if (match) used.add(decodeURIComponent(match[1]));
    }
    if (row.video_url) {
      const match = row.video_url.match(/\/post-media\/(.+)$/);
      if (match) used.add(decodeURIComponent(match[1]));
    }
  }

  return used;
}
