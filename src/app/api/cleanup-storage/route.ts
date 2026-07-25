import { NextResponse } from "next/server";
import { cleanupStorage } from "@/lib/storage-cleanup";

export async function POST() {
  try {
    const result = await cleanupStorage();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cleanup failed" },
      { status: 500 }
    );
  }
}
