import { NextResponse } from "next/server";
import { generatePostText } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const { platform, topic, tone, customInstructions, generateHeadline } = await req.json();

    if (!platform || !topic) {
      return NextResponse.json({ error: "platform and topic required" }, { status: 400 });
    }

    const result = await generatePostText({ platform, topic, tone, customInstructions, generateHeadline });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
