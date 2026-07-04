import { NextResponse } from "next/server";
import { generateImage } from "@/lib/images";

export async function POST(req: Request) {
  try {
    const { prompt, engine = "cloudflare" } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }

    const imageUrl = await generateImage(prompt, engine);
    return NextResponse.json({ imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
