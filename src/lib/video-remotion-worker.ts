import fs from "fs";
import path from "path";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";

interface WorkerInput {
  text: string;
  hashtags?: string;
  backgroundImage?: string;
  backgroundColor?: string;
  style: string;
}

const REMOTION_ENTRY = path.join(process.cwd(), "src", "remotion", "index.ts");

async function render(input: WorkerInput) {
  const { text, hashtags, backgroundImage, backgroundColor, style } = input;
  const compositionId = style || "minimal";
  const duration = Math.max(4, Math.ceil(text.length / 25));
  const filename = `vid_remotion_${Date.now()}.mp4`;
  const outputPath = path.join(process.cwd(), "public", filename);

  console.log(`[Remotion Worker] Bundling...`);
  const bundleLocation = await bundle({
    entryPoint: REMOTION_ENTRY,
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

  console.log(`[Remotion Worker] Getting compositions...`);
  const compositions = await getCompositions(bundleLocation, {
    inputProps: { text, hashtags: hashtags || "", backgroundImage, backgroundColor: backgroundColor || "#1a1a2e" },
  });

  const composition = compositions.find((c: any) => c.id === compositionId);
  if (!composition) throw new Error(`Composition "${compositionId}" not found`);

  composition.durationInFrames = duration * 30;

  console.log(`[Remotion Worker] Rendering "${compositionId}" (${duration}s, ${composition.durationInFrames}f)...`);
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: { text, hashtags: hashtags || "", backgroundImage, backgroundColor: backgroundColor || "#1a1a2e" },
  });

  const renderTime = (Date.now() - startTime) / 1000;
  const result = { url: `/${filename}`, renderTime };
  fs.writeFileSync(path.join(process.cwd(), "public", `_remotion_result_${path.basename(filename, ".mp4")}.json`), JSON.stringify(result));
  console.log(`[Remotion Worker] Done in ${renderTime.toFixed(1)}s`);
}

const startTime = Date.now();
const inputRaw = process.argv[2];
if (!inputRaw) {
  console.error("[Remotion Worker] No input JSON provided");
  process.exit(1);
}

try {
  const input: WorkerInput = JSON.parse(inputRaw);
  render(input).catch((err) => {
    console.error(`[Remotion Worker] Error: ${err.message}`);
    process.exit(1);
  });
} catch (err: any) {
  console.error(`[Remotion Worker] Invalid input: ${err.message}`);
  process.exit(1);
}
