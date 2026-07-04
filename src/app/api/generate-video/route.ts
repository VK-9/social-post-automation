import { NextResponse } from "next/server";
import type { VideoRequest } from "@/lib/video-types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      text, hashtags, engine = "json2video", style = "minimal",
      bgSource = "color", bgColor = "#1a1a2e", bgImageUrl, voiceover = false,
    } = body;

    if (!text) {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }

    let finalBgImageUrl = bgImageUrl || null;

    if (bgSource === "auto" && engine === "json2video") {
      const autoPrompt = body.topic || text.slice(0, 100);
      try {
        const { generateImage } = await import("@/lib/images");
        const img = await generateImage(autoPrompt);
        finalBgImageUrl = new URL(img, req.url).href;
      } catch {
        console.log("[generate-video] Auto bg gen failed, using color fallback");
      }
    }

    const params: VideoRequest = {
      text,
      hashtags,
      bgSource,
      bgColor,
      bgImageUrl: finalBgImageUrl || undefined,
      engine,
      style,
      voiceover,
    };

    let result: { url: string; renderTime?: number };

    if (engine === "json2video") {
      const { generateVideo } = await import("@/lib/video-json2video");
      if (!process.env.JSON2VIDEO_API_KEY) {
        return NextResponse.json({ error: "JSON2VIDEO_API_KEY not configured" }, { status: 500 });
      }
      try {
        const r = await generateVideo(params);
        result = { url: r.url, renderTime: undefined };
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 502 });
      }
    } else if (engine === "remotion") {
      const { generateVideo } = await import("@/lib/video-remotion");
      try {
        const r = await generateVideo(params);
        result = { url: r.url, renderTime: r.renderTime };
      } catch (e: any) {
        return NextResponse.json({ error: `Remotion failed: ${e.message}` }, { status: 502 });
      }
    } else {
      return NextResponse.json({ error: `Unknown engine: ${engine}` }, { status: 400 });
    }

    return NextResponse.json({ videoUrl: result.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Video generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
