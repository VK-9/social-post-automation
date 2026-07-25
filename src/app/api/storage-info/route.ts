import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: files, error } = await supabase.storage
      .from("post-media")
      .list("", { limit: 100, offset: 0, sortBy: { column: "name", order: "asc" } });

    if (error) throw new Error(error.message);

    const fileCount = files?.length || 0;
    let totalBytes = 0;
    for (const f of files || []) {
      if (f.metadata?.size) totalBytes += f.metadata.size;
    }
    const totalMB = Math.round((totalBytes / (1024 * 1024)) * 100) / 100;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const storageUrl = `${supabaseUrl}/project/${supabaseUrl.match(/https:\/\/(.+)\.supabase\.co/)?.[1] || ""}/storage/bucket/post-media`;

    return NextResponse.json({
      fileCount,
      totalMB,
      totalBytes,
      storageUrl,
      freeTierLimit: "1 GB",
      cleanupAfterDays: 7,
    });
  } catch (err) {
    return NextResponse.json({
      fileCount: 0,
      totalMB: 0,
      totalBytes: 0,
      storageUrl: null,
      freeTierLimit: "1 GB",
      cleanupAfterDays: 7,
      error: err instanceof Error ? err.message : "Failed to fetch storage info",
    });
  }
}
