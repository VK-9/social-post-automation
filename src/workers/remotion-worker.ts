import path from "path";
import fs from "fs";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";

interface WorkerInput {
  text: string;
  hashtags?: string;
  backgroundImage?: string;
  backgroundColor?: string;
  style: string;
}

function findChrome(): string | undefined {
  if (process.env.REMOTION_BROWSER_EXECUTABLE) {
    const p = process.env.REMOTION_BROWSER_EXECUTABLE;
    if (fs.existsSync(p)) return p;
  }

  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Chromium\\Application\\chrome.exe",
    path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env.LOCALAPPDATA || "", "Chromium", "Application", "chrome.exe"),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return undefined;
}

const CHROME_PATH = findChrome();
const REMOTION_ENTRY = path.join(process.cwd(), "src", "remotion", "index.ts");

async function main(input: WorkerInput) {
  const { text, hashtags, backgroundImage, backgroundColor, style } = input;
  const compositionId = style || "minimal";
  const duration = Math.min(10, Math.max(4, Math.ceil(text.length / 25)));
  const filename = `vid_remotion_${Date.now()}.mp4`;
  const outputPath = path.join(process.cwd(), "public", filename);
  const resultPath = path.join(process.cwd(), "public", `_remotion_result_${Date.now()}.json`);
  const startTime = Date.now();

  try {
    const bundleLocation = await bundle({
      entryPoint: REMOTION_ENTRY,
      ignoreRegisterRootWarning: true,
      webpackOverride: (config: any) => {
        config.resolve = {
          ...config.resolve,
          alias: {
            ...config.resolve?.alias,
            "@": path.join(process.cwd(), "src"),
          },
        };
        return config;
      },
    });

    const compositions = await getCompositions(bundleLocation, {
      inputProps: { text, hashtags: hashtags || "", backgroundImage, backgroundColor: backgroundColor || "#1a1a2e" },
    });

    const composition = compositions.find((c: any) => c.id === compositionId);
    if (!composition) throw new Error(`Composition "${compositionId}" not found`);

    composition.durationInFrames = duration * 30;

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      browserExecutable: CHROME_PATH,
      inputProps: { text, hashtags: hashtags || "", backgroundImage, backgroundColor: backgroundColor || "#1a1a2e" },
    });

    const renderTime = (Date.now() - startTime) / 1000;
    const result = { url: `/${filename}`, renderTime };

    fs.writeFileSync(resultPath, JSON.stringify(result));
    process.stdout.write(resultPath);
  } catch (err: any) {
    fs.writeFileSync(resultPath, JSON.stringify({ error: err.message }));
    process.stdout.write(resultPath);
  }
}

const inputFile = process.argv[2];
if (!inputFile) {
  process.stderr.write("Usage: remotion-worker.ts <input.json>");
  process.exit(1);
}

try {
  const input: WorkerInput = JSON.parse(fs.readFileSync(inputFile, "utf-8"));
  main(input).catch((err) => {
    const resultPath = path.join(process.cwd(), "public", `_remotion_result_${Date.now()}.json`);
    fs.writeFileSync(resultPath, JSON.stringify({ error: err.message }));
    process.stdout.write(resultPath);
    process.exit(1);
  });
} catch (err: any) {
  process.stderr.write(`Invalid input: ${err.message}`);
  process.exit(1);
}
