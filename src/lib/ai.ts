const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export { OPENROUTER_API_KEY, OPENROUTER_BASE };

let cachedFreeTextModels: string[] | null = null;
let cachedFreeImageModels: string[] | null = null;
let lastFetch = 0;
const CACHE_TTL = 300_000;

async function fetchFreeModels(): Promise<{ text: string[]; image: string[] }> {
  const now = Date.now();
  if (cachedFreeTextModels && cachedFreeImageModels && now - lastFetch < CACHE_TTL) {
    return { text: cachedFreeTextModels, image: cachedFreeImageModels };
  }

  const res = await fetch(`${OPENROUTER_BASE}/models`, {
    headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}` },
  });

  if (!res.ok) {
    return {
      text: [
        "meta-llama/llama-3.1-8b-instruct",
        "mistralai/mistral-7b-instruct",
        "qwen/qwen-2.5-7b-instruct",
      ],
      image: [],
    };
  }

  const data = await res.json();
  const all = (data.data || []) as any[];

  const free = all.filter((m: any) => {
    const p = m.pricing;
    return p && Number(p.prompt) === 0 && Number(p.completion) === 0;
  });

  const text = free
    .filter((m: any) => m.architecture?.modality?.includes("text"))
    .map((m: any) => m.id);

  const image = free
    .filter((m: any) => m.architecture?.modality === "image" || m.architecture?.modality === "text->image")
    .map((m: any) => m.id);

  cachedFreeTextModels = text.length > 0 ? text : [
    "meta-llama/llama-3.1-8b-instruct",
    "mistralai/mistral-7b-instruct",
    "qwen/qwen-2.5-7b-instruct",
  ];
  cachedFreeImageModels = image;
  lastFetch = now;

  return { text: cachedFreeTextModels, image: cachedFreeImageModels };
}

export async function getFreeTextModels(): Promise<string[]> {
  const { text } = await fetchFreeModels();
  return text;
}

export async function getFreeImageModels(): Promise<string[]> {
  const { image } = await fetchFreeModels();
  return image;
}

interface GeneratePostParams {
  platform: string;
  topic: string;
  tone?: string;
  customInstructions?: string;
  generateHeadline?: boolean;
}

export async function generatePostText(params: GeneratePostParams): Promise<{ body: string; hashtags: string; headline?: string }> {
  const { platform, topic, tone = "professional", customInstructions = "", generateHeadline } = params;

  const toneGuide: Record<string, string> = {
    professional: "Professional, authoritative, and polished. Use industry-appropriate language.",
    casual: "Casual, friendly, and conversational. Write like you're talking to a friend.",
    formal: "Formal, structured, and business-appropriate. Use proper grammar and structure.",
    playful: "Playful, fun, and humorous. Use wit, light-hearted jokes, and an upbeat tone.",
    human: "Authentic, relatable, and natural. Write like a real person sharing genuine thoughts — imperfect, warm, and down-to-earth. Avoid corporate jargon, overly polished language, or generic marketing speak. Use contractions, personal anecdotes if appropriate, and a conversational rhythm.",
  };

  const toneDescription = toneGuide[tone] || toneGuide.professional;

  const headlineInstruction = generateHeadline
    ? ' Also include a short attention-grabbing headline (max 10 words) suitable for LinkedIn. Return JSON with keys: "body", "headline", "hashtags".'
    : ' Return JSON with keys: "body", "hashtags".';

  const systemPrompt = `You are a social media content creator. Write a ${platform} post about the given topic.
Tone: ${toneDescription}
${customInstructions ? `Additional instructions: ${customInstructions}` : ""}
${headlineInstruction}`;

  const models = await getFreeTextModels();
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
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Write a ${platform} post about: ${topic}` },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        lastError = `OpenRouter error: ${res.status}`;
        continue;
      }

      const data = await res.json();
      const content = JSON.parse(data.choices[0].message.content);
      return { body: content.body, hashtags: content.hashtags, headline: content.headline };
    } catch {
      lastError = "All free models failed";
    }
  }

  throw new Error(lastError || "No response from OpenRouter");
}
