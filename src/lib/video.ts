import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const FONT_FILE = "public/arial.ttf";
const FONT_SOURCE = "C:\\Windows\\Fonts\\arial.ttf";

function findFfmpeg(): string {
  try {
    const result = execSync("where ffmpeg", { stdio: "pipe", timeout: 5000 })
      .toString().trim().split("\n")[0];
    if (result) return result;
  } catch {}

  const candidates = [
    "C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe",
    "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
    "ffmpeg",
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return "ffmpeg";
}

const FFMPEG_PATH = findFfmpeg();

export async function generateTextOverlayVideo(
  text: string,
  imagePath: string | null,
  backgroundColor: string = "#1a1a2e"
): Promise<string> {
  const filename = `vid_${Date.now()}.mp4`;
  const outputPath = path.join(process.cwd(), "public", filename);
  const fontFullPath = path.join(process.cwd(), FONT_FILE);

  if (!fs.existsSync(fontFullPath)) {
    try { fs.copyFileSync(FONT_SOURCE, fontFullPath); } catch {}
  }

  const maxChars = 100;
  const truncated = text.length > maxChars
    ? text.substring(0, maxChars) + "..."
    : text;

  const textRelPath = `public/drawtext_${Date.now()}.txt`;
  const textFullPath = path.join(process.cwd(), textRelPath);

  try {
    fs.writeFileSync(textFullPath, truncated, "utf-8");

    const drawtext = `drawtext=textfile=${textRelPath}:fontfile=${FONT_FILE}:fontsize=24:fontcolor=white:x=(w-text_w)/2:y=h-100:box=1:boxcolor=black@0.5:boxborderw=10`;

    if (imagePath) {
      const imageFullPath = path.join(process.cwd(), "public", imagePath);
      execSync(
        `"${FFMPEG_PATH}" -y -loop 1 -i "${imageFullPath}" -vf "${drawtext}" -t 5 -c:v libx264 -pix_fmt yuv420p "${outputPath}"`,
        { timeout: 30000, stdio: "pipe" }
      );
    } else {
      execSync(
        `"${FFMPEG_PATH}" -y -f lavfi -i "color=c=${backgroundColor.replace("#", "0x")}:s=1024x1024:d=5" -vf "${drawtext}" -t 5 -c:v libx264 -pix_fmt yuv420p "${outputPath}"`,
        { timeout: 30000, stdio: "pipe" }
      );
    }

    return `/${filename}`;
  } catch (e) {
    console.error("Video generation failed, falling back to image-only", e);
    return imagePath || `/${filename}`;
  } finally {
    try { fs.unlinkSync(textFullPath); } catch {}
  }
}
