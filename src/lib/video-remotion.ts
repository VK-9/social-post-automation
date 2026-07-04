import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import type { VideoRequest } from "./video-types";

const WORKER_PATH = path.join(process.cwd(), "src", "workers", "remotion-worker.ts");

export async function generateVideo(params: VideoRequest): Promise<{ url: string; renderTime: number }> {
  const input = {
    text: params.text,
    hashtags: params.hashtags || "",
    backgroundImage: params.bgSource === "upload" || params.bgSource === "ai" ? params.bgImageUrl : undefined,
    backgroundColor: params.bgColor || "#1a1a2e",
    style: params.style || "minimal",
  };

  const tempInput = path.join(process.cwd(), "public", `_remotion_input_${Date.now()}.json`);
  fs.writeFileSync(tempInput, JSON.stringify(input), "utf-8");

  try {
    const stdout = execSync(
      `npx tsx "${WORKER_PATH}" "${tempInput}"`,
      { cwd: process.cwd(), timeout: 600000, maxBuffer: 1024 * 1024 }
    ).toString().trim();

    const resultPath = stdout;
    if (!fs.existsSync(resultPath)) throw new Error(`Result file not found: ${resultPath}`);

    const resultData = JSON.parse(fs.readFileSync(resultPath, "utf-8"));
    if (resultData.error) throw new Error(resultData.error);

    try { fs.unlinkSync(resultPath); } catch {}

    return { url: resultData.url, renderTime: resultData.renderTime };
  } catch (e: any) {
    const msg = e.stderr ? e.stderr.toString().slice(0, 500) : e.message;
    throw new Error(`Remotion: ${msg}`);
  } finally {
    try { fs.unlinkSync(tempInput); } catch {}
  }
}

export function getTemplateLabel(template: string): string {
  const map: Record<string, string> = {
    minimal: "Minimal",
    "quote-card": "Quote Card",
    "story-mode": "Story Mode",
    slideshow: "Slideshow",
  };
  return map[template] || template;
}
