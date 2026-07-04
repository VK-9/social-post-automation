import fs from "fs/promises";
import path from "path";
import { OPENROUTER_API_KEY, OPENROUTER_BASE, getFreeImageModels } from "./ai";

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

async function saveImage(buffer: Buffer): Promise<string> {
  const filename = `img_${Date.now()}.png`;
  const publicDir = path.join(process.cwd(), "public");
  await fs.mkdir(publicDir, { recursive: true });
  await fs.writeFile(path.join(publicDir, filename), buffer);
  return `/${filename}`;
}

export async function generateImageCloudflare(prompt: string): Promise<string> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: `Social media post image: ${prompt}. Professional, clean, high quality.`,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudflare AI error: ${res.status} ${err}`);
  }

  const contentType = res.headers.get("content-type") || "";
  let buffer: Buffer;

  if (contentType.includes("image/png") || contentType.includes("image/")) {
    const arrayBuffer = await res.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    const data = await res.json();
    if (!data.success) {
      throw new Error(`Cloudflare AI: ${data.errors?.[0]?.message || "unknown error"}`);
    }
    const base64 = data.result.image;
    buffer = Buffer.from(base64, "base64");
  }

  return saveImage(buffer);
}

export async function generateImageOpenRouter(prompt: string): Promise<string> {
  const models = await getFreeImageModels();
  if (models.length === 0) {
    throw new Error("No free image models available on OpenRouter");
  }

  let lastError: string | null = null;

  for (const model of models) {
    try {
      const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://github.com/social-post-automation",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!res.ok) {
        lastError = `OpenRouter error: ${res.status}`;
        continue;
      }

      const data = await res.json();
      const message = data.choices?.[0]?.message;
      const content = message?.content || "";

      // Try to extract image URL from content (Markdown image or plain URL)
      const markdownMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
      const urlMatch = content.match(/(https?:\/\/[^\s)]+\.(png|jpg|jpeg|gif|webp))/i);

      if (markdownMatch) {
        const imgRes = await fetch(markdownMatch[1]);
        if (imgRes.ok) {
          const arrayBuffer = await imgRes.arrayBuffer();
          return saveImage(Buffer.from(arrayBuffer));
        }
      }

      if (urlMatch) {
        const imgRes = await fetch(urlMatch[1]);
        if (imgRes.ok) {
          const arrayBuffer = await imgRes.arrayBuffer();
          return saveImage(Buffer.from(arrayBuffer));
        }
      }

      // Try base64 data URL in content
      const base64Match = content.match(/data:image\/(png|jpeg|jpg|gif|webp);base64,([^"'\s)]+)/);
      if (base64Match) {
        const buffer = Buffer.from(base64Match[2], "base64");
        return saveImage(buffer);
      }

      lastError = "Could not extract image from OpenRouter response";
    } catch {
      lastError = "OpenRouter image model failed";
    }
  }

  throw new Error(lastError || "No image generated from OpenRouter");
}

export async function generateImage(prompt: string, engine: "cloudflare" | "openrouter" = "cloudflare"): Promise<string> {
  if (engine === "openrouter") {
    const models = await getFreeImageModels();
    if (models.length > 0) {
      return generateImageOpenRouter(prompt);
    }
  }
  return generateImageCloudflare(prompt);
}
