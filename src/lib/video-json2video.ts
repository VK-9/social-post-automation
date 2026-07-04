import type { VideoRequest, Json2VideoStyle } from "./video-types";

const API_BASE = "https://api.json2video.com/v2";
const API_KEY = process.env.JSON2VIDEO_API_KEY;

function bgHtml(color: string): object {
  return { type: "html" as const, html: `<div style="width:100%;height:100%;background:${color}"></div>`, duration: -2 };
}

function buildMovieJSON(params: VideoRequest) {
  const { text, hashtags, bgSource, bgColor, bgImageUrl, style, voiceover } = params;
  const s = (style || "minimal") as Json2VideoStyle;

  const gradientScenes = (colors: string[]) => ({
    scenes: [{
      duration: Math.min(10, Math.max(4, Math.ceil(text.length / 30))),
      elements: [
        { type: "image", src: `https://cdn.json2video.com/assets/images/gradient-${colors[0].replace("#", "")}.jpg`, resize: "cover", duration: -2 },
        {
          type: "text", text,
          style: "011",
          settings: {
            "font-family": "Inter", "font-size": "36px", "font-weight": "600",
            "font-color": "#ffffff", "text-align": "center",
            "vertical-position": "center", "horizontal-position": "center",
            "background-color": "rgba(0,0,0,0.3)", padding: "20px",
          },
          fadeIn: 0.5, duration: -2,
        },
        ...(hashtags ? [{
          type: "text" as const, text: hashtags,
          style: "001",
          settings: {
            "font-family": "Inter", "font-size": "18px", "font-weight": "400",
            "font-color": "rgba(255,255,255,0.7)", "text-align": "center",
            "vertical-position": "bottom", "horizontal-position": "center",
          },
          start: 0.5, duration: -2, fadeIn: 0.5,
        }] : []),
      ],
    }],
  });

  const styleMap: Record<Json2VideoStyle, object> = {
    minimal: {
      scenes: [{
        duration: Math.min(10, Math.max(4, Math.ceil(text.length / 25))),
        elements: [
          ...(bgSource === "color" || bgSource === "auto"
            ? [bgHtml(bgColor || "#1a1a2e")]
            : [{ type: "image" as const, src: bgImageUrl!, resize: "cover", duration: -2 }]
          ),
          {
            type: "text", text,
            style: "001",
            settings: {
              "font-family": "Inter", "font-size": "32px", "font-weight": "500",
              "font-color": "#ffffff", "text-align": "center",
              "vertical-position": "center", "horizontal-position": "center",
            },
            fadeIn: 0.8, duration: -2,
          },
          ...(hashtags ? [{
            type: "text" as const, text: hashtags,
            style: "001",
            settings: {
              "font-family": "Inter", "font-size": "16px", "font-weight": "400",
              "font-color": "rgba(255,255,255,0.6)", "text-align": "center",
              "vertical-position": "bottom", "horizontal-position": "center",
            },
            start: 1, duration: -2, fadeIn: 0.5,
          }] : []),
        ],
      }],
    },

    "bold-quote": {
      scenes: [{
        duration: Math.min(10, Math.max(5, Math.ceil(text.length / 20))),
        elements: [
          ...(bgSource === "color" || bgSource === "auto"
            ? [bgHtml(bgColor || "#0f0f23")]
            : [{ type: "image" as const, src: bgImageUrl!, resize: "cover", duration: -2, correction: { brightness: -0.3 } }]
          ),
          {
            type: "text", text: `"${text}"`,
            style: "005",
            settings: {
              "font-family": "Playfair Display", "font-size": "44px", "font-weight": "700",
              "font-color": "#ffffff", "text-align": "center", "font-style": "italic",
              "vertical-position": "center", "horizontal-position": "center",
              "background-color": "rgba(0,0,0,0.4)", padding: "30px",
            },
            fadeIn: 1, duration: -2,
          },
        ],
      }],
    },

    cinematic: {
      scenes: [{
        duration: Math.min(10, Math.max(6, Math.ceil(text.length / 18))),
        elements: [
          ...(bgSource === "color" || bgSource === "auto"
            ? [bgHtml(bgColor || "#1a1a2e")]
            : [
              { type: "image" as const, src: bgImageUrl!, resize: "cover", duration: -2, zoom: 2, pan: "right" },
            ]
          ),
          { type: "html", html: '<div style="width:100%;height:100%;background:rgba(0,0,0,0.5)"></div>', duration: -2 },
          {
            type: "text", text,
            style: "011",
            settings: {
              "font-family": "Montserrat", "font-size": "28px", "font-weight": "300",
              "font-color": "#ffffff", "text-align": "center", "letter-spacing": "2px",
              "vertical-position": "center", "horizontal-position": "center",
              "background-color": "rgba(0,0,0,0.2)", padding: "20px",
            },
            fadeIn: 1.5, duration: -2,
          },
          ...(hashtags ? [{
            type: "text" as const, text: hashtags,
            style: "001",
            settings: {
              "font-family": "Montserrat", "font-size": "14px", "font-weight": "300",
              "font-color": "rgba(255,255,255,0.5)", "text-align": "center",
              "vertical-position": "bottom", "horizontal-position": "center", "letter-spacing": "1px",
            },
            start: 2, duration: -2, fadeIn: 0.5,
          }] : []),
        ],
      }],
    },

    story: {
      scenes: [{
        duration: Math.min(10, Math.max(4, Math.ceil(text.length / 28))),
        elements: [
          ...(bgSource === "color" || bgSource === "auto"
            ? [bgHtml(bgColor || "#2d1b69")]
            : [{ type: "image" as const, src: bgImageUrl!, resize: "cover", duration: -2 }]
          ),
          { type: "html", html: '<div style="position:absolute;bottom:0;width:100%;height:40%;background:rgba(0,0,0,0.3)"></div>', duration: -2 },
          {
            type: "text", text,
            style: "001",
            settings: {
              "font-family": "Inter", "font-size": "30px", "font-weight": "600",
              "font-color": "#ffffff", "text-align": "left",
              "vertical-position": "bottom", "horizontal-position": "left",
              padding: "30px",
            },
            fadeIn: 0.5, duration: -2,
          },
        ],
      }],
    },

    gradient: gradientScenes(["#667eea", "#764ba2"]),
  };

  const movie: Record<string, unknown> = {
    resolution: "instagram-story",
    quality: "high",
    ...styleMap[s],
  };

  if (voiceover && text.length > 5) {
    (movie as any).scenes[0].elements.push({
      type: "voice",
      provider: "azure",
      voice: "en-US-JennyNeural",
      speed: "1.0",
      text,
      duration: -2,
    });
  }

  return movie;
}

export async function generateVideo(params: VideoRequest): Promise<{ url: string; projectId: string }> {
  if (!API_KEY) throw new Error("JSON2VIDEO_API_KEY not configured");

  const movie = buildMovieJSON(params);
  console.log("[JSON2Video] Creating movie...");

  const createRes = await fetch(`${API_BASE}/movies`, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(movie),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`JSON2Video create failed (${createRes.status}): ${err}`);
  }

  const { project } = await createRes.json();
  if (!project) throw new Error("JSON2Video: no project ID returned");

  console.log(`[JSON2Video] Project ID: ${project}, polling...`);

  const startTime = Date.now();
  const timeout = 180000;
  let lastStatus = "";

  while (Date.now() - startTime < timeout) {
    const pollRes = await fetch(`${API_BASE}/movies?project=${project}`, {
      headers: { "x-api-key": API_KEY },
    });

    if (!pollRes.ok) {
      const err = await pollRes.text();
      throw new Error(`JSON2Video poll failed (${pollRes.status}): ${err}`);
    }

    const data = await pollRes.json();
    const movieData = data.movie || data;
    const status = movieData.status;

    if (status !== lastStatus) {
      console.log(`[JSON2Video] Status: ${status}`);
      lastStatus = status;
    }

    if (status === "done") {
      const videoUrl = movieData.url;
      if (!videoUrl) throw new Error("JSON2Video: done but no URL");
      console.log(`[JSON2Video] Render complete in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
      return { url: videoUrl, projectId: project };
    }

    if (status === "error" || status === "failed") {
      throw new Error(`JSON2Video render failed: ${movieData.message || "unknown error"}`);
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error(`JSON2Video render timed out after ${timeout / 1000}s`);
}

export function getStyleLabel(style: string): string {
  const map: Record<string, string> = {
    minimal: "Minimal",
    "bold-quote": "Bold Quote",
    cinematic: "Cinematic",
    story: "Story",
    gradient: "Gradient",
  };
  return map[style] || style;
}
