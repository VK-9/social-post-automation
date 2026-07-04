# Implementation Plan — Social Post Automation

Build a free, autonomous social media post generator with text + image + video publishing to 6 platforms.

## Prerequisites
- Node.js 20+, npm
- Supabase account (free tier)
- OpenRouter account (free tier, ~20 RPM)
- Cloudflare account (Workers AI free, 100k calls/day)
- Postproxy account (free, 10 cross-posts/month)
- JSON2Video account (free, 600s)
- Google Chrome (for Remotion rendering)

---

## Phase 1: Project Scaffold

### 1.1 Create Next.js app
```bash
npx create-next-app@latest social-post-automation --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
cd social-post-automation
```

### 1.2 Install core dependencies
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install @base-ui/react lucide-react sonner nanoid
npm install date-fns class-variance-authority clsx tailwind-merge
npm install next-themes tw-animate-css
npm install zustand  # unused but harmless
npm install @libsql/client  # unused but harmless
```

### 1.3 Install shadcn/ui CLI and init
```bash
npx shadcn@latest init
# Select style: "base-nova" (or "new-york")
# Base color: "slate"
# CSS variables: yes
```

### 1.4 Install shadcn components
```bash
npx shadcn@latest add button card input label textarea badge separator tabs tooltip sheet dialog avatar dropdown-menu table select sonner calendar
```

### 1.5 Install video dependencies
```bash
npm install remotion @remotion/bundler @remotion/renderer puppeteer
npm install -D tsx
```

### 1.6 Set up .env.local
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
OPENROUTER_API_KEY=sk-or-...
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
POSTPROXY_API_KEY=...
POSTPROXY_PROFILE_GROUP_ID=...
POSTPROXY_PROFILE_IDS=id1,id2,id3,id4,id5
JSON2VIDEO_API_KEY=...
```

### 1.7 Configure next.config.ts
```ts
const nextConfig = {
  serverExternalPackages: ["@remotion/bundler", "@remotion/renderer"],
};
```

---

## Phase 2: Database (Supabase)

### 2.1 Create Supabase project
- Go to supabase.com → New project → `social-post-automation`
- Region: US West
- Copy project URL and anon key to `.env.local`

### 2.2 Run SQL in Supabase SQL Editor (no migration files)
```sql
-- content_items table
CREATE TABLE content_items (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  platform TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'post',
  status TEXT NOT NULL DEFAULT 'draft',
  topic TEXT,
  body TEXT,
  headline TEXT,
  image_url TEXT,
  video_url TEXT,
  hashtags TEXT,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  postproxy_post_id TEXT,
  ai_model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- public.users table for FK reference (RLS disabled means direct INSERT works)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: auto-create public.users row on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS disabled on all tables
```

### 2.3 Disable RLS
In Supabase Dashboard → Authentication → Policies → Disable RLS for `content_items` and `users`.

---

## Phase 3: Files to Create (in order)

### 3.1 `src/types/index.ts`
```typescript
type Platform = "twitter" | "linkedin" | "facebook" | "instagram" | "pinterest" | "threads";
type ContentStatus = "draft" | "scheduled" | "publishing" | "published" | "failed";
type ContentType = "post" | "thread" | "carousel";

interface ContentItem {
  id: string;
  user_id: string;
  platform: string;
  content_type: ContentType;
  status: ContentStatus;
  topic?: string;
  body?: string;
  headline?: string;
  image_url?: string;
  video_url?: string;
  hashtags?: string;
  scheduled_at?: string;
  published_at?: string;
  postproxy_post_id?: string;
  ai_model?: string;
  created_at: string;
  updated_at: string;
}
```

### 3.2 `src/lib/utils.ts`
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 3.3 `src/lib/supabase.ts`
```ts
import { createBrowserClient } from "@supabase/ssr";
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### 3.4 `src/lib/supabase-server.ts`
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
}
```

### 3.5 `src/lib/db.ts`
```ts
import { createClient } from "@supabase/supabase-js";
let supabase: ReturnType<typeof createClient> | null = null;
export function getServerSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabase;
}
export async function getUserId() {
  const { data: { user } } = await getServerSupabase().auth.getUser();
  return user?.id;
}
```

### 3.6 `src/lib/ai.ts`
```ts
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "meta-llama/llama-3.1-8b-instruct";

interface GenerateParams {
  platform: string;
  topic: string;
  tone?: string;
  customInstructions?: string;
  generateHeadline?: boolean;
}

export async function generatePostText(params: GenerateParams) {
  const toneInstructions: Record<string, string> = {
    professional: "Write in a professional, authoritative tone suitable for business audiences.",
    casual: "Write in a casual, conversational tone as if talking to a friend.",
    formal: "Write in a formal, polished tone with proper structure.",
    playful: "Write in a playful, witty, and engaging tone.",
    human: "Write in a natural, human tone that feels authentic and relatable.",
  };

  const toneText = toneInstructions[params.tone || "professional"] || params.tone;
  const headlineInstruction = params.generateHeadline
    ? `\nAlso generate a catchy headline for LinkedIn (as a separate "headline" field).`
    : "";

  const prompt = `Generate a social media post for ${params.platform} about: ${params.topic}
Tone: ${toneText}
${params.customInstructions ? `Additional instructions: ${params.customInstructions}` : ""}
${headlineInstruction}
Include relevant hashtags (3-5).
Respond with JSON: { "body": "...", "hashtags": "...", "headline": "..." }`;

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }] }),
  });

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { body: text, hashtags: "" };
  }
}
```

### 3.7 `src/lib/images.ts`
```ts
export async function generateImage(prompt: string) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    }
  );
  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0]?.message || "Image generation failed");

  const base64 = data.result.image;
  const buffer = Buffer.from(base64, "base64");
  const filename = `img_${Date.now()}.png`;
  const fs = await import("fs/promises");
  await fs.writeFile(`public/${filename}`, buffer);

  return `/${filename}`;
}
```

### 3.8 `src/lib/video-types.ts`
```ts
export type VideoEngine = "json2video" | "remotion";
export type BgSource = "auto" | "color" | "upload" | "ai";
export type Json2VideoStyle = "minimal" | "bold-quote" | "cinematic" | "story" | "gradient";
export type RemotionTemplate = "minimal" | "quote-card" | "story-mode" | "slideshow";

export const JSON2VIDEO_STYLES: { id: Json2VideoStyle; label: string; desc: string }[] = [
  { id: "minimal", label: "Minimal", desc: "Clean centered text" },
  { id: "bold-quote", label: "Bold Quote", desc: "Large italic quote" },
  { id: "cinematic", label: "Cinematic", desc: "Film-style with zoom" },
  { id: "story", label: "Story", desc: "Instagram Story layout" },
  { id: "gradient", label: "Gradient", desc: "Animated colors" },
];

export const REMOTION_TEMPLATES: { id: RemotionTemplate; label: string; desc: string }[] = [
  { id: "minimal", label: "Minimal", desc: "Text fade-in on color" },
  { id: "quote-card", label: "Quote Card", desc: "Serif quote with bg" },
  { id: "story-mode", label: "Story Mode", desc: "Full-bleed story" },
  { id: "slideshow", label: "Slideshow", desc: "Multi-slide sequence" },
];

export const BG_SOURCES: { id: BgSource; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "color", label: "Color" },
  { id: "upload", label: "Upload" },
  { id: "ai", label: "AI Image" },
];
```

### 3.9 `src/lib/video-json2video.ts`
Full JSON2Video integration — builds movie JSON with style-specific templates, polls until done.
- API endpoint: `https://api.json2video.com/v2/movies`
- All durations capped at 10s
- Supports background color, uploaded image, AI-generated image
- Voiceover via Azure TTS (`en-US-JennyNeural`)
- Polls every 2s up to 180s timeout
```ts
const JSON2VIDEO_URL = "https://api.json2video.com/v2/movies";
const MAX_DURATION = 10;

interface VideoParams {
  text: string; hashtags?: string; style?: string; bgColor?: string;
  bgImageUrl?: string | null; voiceover?: boolean; topic?: string;
}

export async function generateVideo(params: VideoParams) {
  const style = params.style || "minimal";
  const bgColor = params.bgColor || "#1a1a2e";
  const duration = Math.min(MAX_DURATION, Math.max(3, Math.ceil(params.text.length / 20)));

  const clips: any[] = [];
  const bgImage = params.bgImageUrl
    ? [{ type: "image", src: params.bgImageUrl, duration }]
    : [{ type: "color", value: bgColor, duration }];

  const textStyle: Record<string, any> = {
    minimal: { fontSize: 48, fontFamily: "Inter", fontWeight: "700", color: "#ffffff" },
    "bold-quote": { fontSize: 52, fontFamily: "Georgia", fontStyle: "italic", color: "#ffffff" },
    cinematic: { fontSize: 44, fontFamily: "Inter", fontWeight: "300", color: "#ffffff", letterSpacing: 2 },
    story: { fontSize: 38, fontFamily: "Inter", fontWeight: "600", color: "#ffffff" },
    gradient: { fontSize: 46, fontFamily: "Inter", fontWeight: "800", color: "#ffffff" },
  }[style] || { fontSize: 48, fontFamily: "Inter", color: "#ffffff" };

  if (style === "minimal" || style === "gradient") {
    clips.push({ type: "text", value: params.text, ...textStyle, x: "10%", y: "35%", width: "80%" });
  } else if (style === "bold-quote") {
    clips.push({ type: "text", value: `"${params.text}"`, ...textStyle, x: "8%", y: "30%", width: "84%" });
  } else if (style === "cinematic") {
    clips.push({ type: "text", value: params.text, ...textStyle, x: "15%", y: "60%", width: "70%" });
  } else if (style === "story") {
    clips.push({ type: "text", value: params.text, ...textStyle, x: "5%", y: "50%", width: "90%" });
  }

  if (params.hashtags) {
    clips.push({ type: "text", value: params.hashtags, fontSize: 28, color: "#94a3b8", x: "10%", y: "75%", width: "80%" });
  }

  const voiceover = params.voiceover ? [{ type: "tts", text: params.text, voice: "en-US-JennyNeural" }] : [];

  const movie = { project: { name: `Social Post - ${params.topic || "untitled"}` }, clips: [...bgImage, ...clips, ...voiceover], resolution: "full-hd" };

  const res = await fetch(JSON2VIDEO_URL, {
    method: "POST",
    headers: { "x-api-key": process.env.JSON2VIDEO_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify(movie),
  });
  const { movieId } = await res.json();
  if (!movieId) throw new Error("JSON2Video creation failed");

  // Poll until done (up to 180s)
  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(`${JSON2VIDEO_URL}/${movieId}`, {
      headers: { "x-api-key": process.env.JSON2VIDEO_API_KEY! },
    });
    const status = await statusRes.json();
    if (status.movie?.status === "done") return status.movie.url;
  }
  throw new Error("JSON2Video timeout");
}
```

### 3.10 `src/lib/video-remotion.ts`
```ts
import { execSync } from "child_process";
import { writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";

export async function generateVideo(params: {
  text: string; template?: string; bgColor?: string; bgImageUrl?: string | null;
}) {
  const input = {
    text: params.text.slice(0, 200),
    template: params.template || "minimal",
    backgroundColor: params.bgColor || "#1a1a2e",
    backgroundImage: params.bgImageUrl || null,
  };

  const tmpDir = join(process.cwd(), "public");
  const inputFile = join(tmpDir, `_remotion_input_${Date.now()}.json`);
  writeFileSync(inputFile, JSON.stringify(input));
  const workerPath = join(process.cwd(), "src/workers/remotion-worker.ts");

  const output = execSync(`npx tsx "${workerPath}" "${inputFile}"`, {
    cwd: process.cwd(), timeout: 300000,
  }).toString().trim();

  try { unlinkSync(inputFile); } catch {}

  try {
    const resultPath = output;
    const fs = await import("fs/promises");
    const result = JSON.parse(await fs.readFile(resultPath, "utf-8"));
    try { await fs.unlink(resultPath); } catch {}
    if (result.error) throw new Error(result.error);
    return result.url;
  } catch {
    throw new Error("Remotion rendering failed");
  }
}
```

### 3.11 `src/lib/publisher.ts`
```ts
const POSTPROXY_URL = "https://api.postproxy.dev/v1/posts";

export async function publishToSocial(params: {
  content: string; headline?: string; platforms?: string[];
  imageUrl?: string | null; videoUrl?: string | null;
}) {
  const content: any[] = [{ type: "text", value: params.headline ? `${params.headline}\n\n${params.content}` : params.content }];
  if (params.imageUrl) content.push({ type: "image", url: params.imageUrl });
  if (params.videoUrl) content.push({ type: "video", url: params.videoUrl });

  const res = await fetch(POSTPROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.POSTPROXY_API_KEY! },
    body: JSON.stringify({
      profile_group_id: process.env.POSTPROXY_PROFILE_GROUP_ID,
      profiles: process.env.POSTPROXY_PROFILE_IDS?.split(",") || [],
      content,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Postproxy publish failed");
  return data;
}

export async function getPublishStatus(postId: string) {
  const res = await fetch(`${POSTPROXY_URL}/${postId}`, {
    headers: { "x-api-key": process.env.POSTPROXY_API_KEY! },
  });
  return res.json();
}
```

### 3.12 `src/lib/scheduler.ts`
```ts
import { createClient } from "@supabase/supabase-js";
import { publishToSocial } from "./publisher";

let interval: NodeJS.Timeout | null = null;

export function startScheduler() {
  if (interval) return;
  interval = setInterval(async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: items } = await supabase
      .from("content_items" as any)
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .is("postproxy_post_id", null);

    for (const item of (items || [])) {
      try {
        await supabase.from("content_items" as any).update({ status: "publishing" }).eq("id", item.id);
        const result = await publishToSocial({
          content: item.body || "",
          headline: item.headline,
          imageUrl: item.image_url,
          videoUrl: item.video_url,
        });
        await supabase.from("content_items" as any).update({
          status: "published", published_at: new Date().toISOString(), postproxy_post_id: result.id,
        }).eq("id", item.id);
      } catch {
        await supabase.from("content_items" as any).update({ status: "failed" }).eq("id", item.id);
      }
    }
  }, 30000);
}

export function stopScheduler() {
  if (interval) { clearInterval(interval); interval = null; }
}
```

---

## Phase 4: Remotion Files

### 4.1 `src/remotion/index.ts`
```ts
import { registerRoot } from "remotion";
import { Root } from "./Root";
registerRoot(Root);
```

### 4.2 `src/remotion/Root.tsx`
```tsx
import { Composition } from "remotion";
import { Minimal } from "./templates/Minimal";
import { QuoteCard } from "./templates/QuoteCard";
import { StoryMode } from "./templates/StoryMode";
import { Slideshow } from "./templates/Slideshow";

export type VideoProps = {
  text: string; hashtags?: string; backgroundImage?: string; backgroundColor?: string;
};

const fps = 30;

export function Root() {
  return (
    <>
      <Composition id="minimal" component={Minimal} durationInFrames={5 * fps} fps={fps} width={1080} height={1920} defaultProps={{ text: "Hello" }} />
      <Composition id="quote-card" component={QuoteCard} durationInFrames={6 * fps} fps={fps} width={1080} height={1920} defaultProps={{ text: "Quote" }} />
      <Composition id="story-mode" component={StoryMode} durationInFrames={5 * fps} fps={fps} width={1080} height={1920} defaultProps={{ text: "Story" }} />
      <Composition id="slideshow" component={Slideshow} durationInFrames={8 * fps} fps={fps} width={1080} height={1920} defaultProps={{ text: "Slides" }} />
    </>
  );
}
```

### 4.3 Remotion templates
Four templates in `src/remotion/templates/`:
- `Minimal.tsx` — centered white text, fade-in + slide-up, `backgroundColor` prop
- `QuoteCard.tsx` — large italic serif quote, scale-in, optional bg image with brightness
- `StoryMode.tsx` — full-bleed bg/gradient, bottom text, gradient overlay
- `Slideshow.tsx` — multi-slide sequence, splits text by sentence, cycles 4 colors, max 4 slides

All templates: 1080x1920, 30fps, max 10s, receive `VideoProps`.

### 4.4 `src/workers/remotion-worker.ts`
Standalone script executed via `npx tsx`:
1. Reads JSON from CLI arg file path
2. Finds Chrome (env var `REMOTION_BROWSER_EXECUTABLE` → `C:\Program Files\Google\Chrome\Application\chrome.exe` → Puppeteer fallback)
3. Bundles entry via `@remotion/bundler`
4. Renders via `@remotion/renderer.renderMedia` (h264, CRF 18)
5. Writes `{ url, renderTime }` to temp JSON in `public/`, prints path to stdout

---

## Phase 5: Middleware

### 5.1 `src/middleware.ts`
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll(); }, setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value)); supabaseResponse = NextResponse.next({ request }); cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options)); } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!user && path !== "/login" && path !== "/register") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return supabaseResponse;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
```

---

## Phase 6: API Routes

### 6.1 `src/app/api/content/route.ts`
- `GET /api/content?userId=...&status=...` — list content items (status supports comma-separated)
- `POST /api/content` — create content item, generate nanoid id
- Uses `getServerSupabase()` with `as any` cast on `.from("content_items")`

### 6.2 `src/app/api/content/[id]/route.ts`
- `PATCH /api/content/[id]` — update content item fields + updated_at
- `DELETE /api/content/[id]` — delete by id

### 6.3 `src/app/api/generate/route.ts`
- `POST /api/generate` — calls `generatePostText({ platform, topic, tone, customInstructions, generateHeadline })`
- Returns `{ body, hashtags, headline? }`

### 6.4 `src/app/api/generate-image/route.ts`
- `POST /api/generate-image` — calls `generateImage(prompt)`
- Returns `{ imageUrl }`

### 6.5 `src/app/api/generate-video/route.ts`
- `POST /api/generate-video` — dispatches to JSON2Video or Remotion based on `engine` param
- Auto-generates background image if `bgSource === "auto"`
- Returns `{ videoUrl }`

### 6.6 `src/app/api/publish/route.ts`
- `POST /api/publish` — fetches content by id, calls `publishToSocial`, updates status
- Body: `{ contentId, profileGroupId?, profileIds? }`

### 6.7 `src/app/api/schedule/route.ts`
- `POST /api/schedule` — sets `status: "scheduled"` + `scheduled_at`
- `GET /api/schedule?userId=...&start=...&end=...` — lists scheduled items in date range

### 6.8 `src/app/api/upload/route.ts`
- `POST /api/upload` — multipart form `file`, saves to `public/`, returns `{ url }`
- Validates file type (image/* only)

### 6.9 `src/app/api/postproxy-usage/route.ts`
- `GET /api/postproxy-usage` — queries Postproxy for current month usage + Supabase for scheduled counts
- Returns `{ used, limit (10), remaining, postproxyUsed, scheduledCount, resetDate, months[] }`
- `months[]` has 3 entries: current month + 2 future months (for scheduling messaging)

### 6.10 `src/app/api/connected-platforms/route.ts`
- `GET /api/connected-platforms` — fetches profiles from Postproxy API, falls back to default list
- Returns `{ platforms: string[] }`

---

## Phase 7: UI Pages

### 7.1 Globals CSS
Create `src/app/globals.css` with:
- Neumorphism color variables (`--background: #eef0f4`, `--foreground: #2d3436`)
- `neu-card`, `neu-card-sm`, `neu-inset`, `neu-inset-sm`, `neu-button`, `neu-sidebar` utilities
- No borders on cards or inputs
- Emerald primary accent (`#059669`)

### 7.2 Root layout (`src/app/layout.tsx`)
```tsx
import { Toaster } from "sonner";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
```

### 7.3 Auth pages
- `/login` — email/password sign-in, debug output, neu-card, neu-inset inputs
- `/register` — name/email/password sign-up, Sparkles icon, neu-card
- Both centered on `bg-background`, use `supabase.auth.signInWithPassword()` / `signUp()`

### 7.4 Dashboard layout
- Side navigation: Dashboard, Create Post, Content Queue, Calendar, Settings + Sign Out
- Desktop: left sidebar (`neu-sidebar`), mobile: bottom tab bar
- Active route: `neu-inset-sm`, inactive: hover `neu-inset-sm`
- Uses `neu-sidebar` class (shadow-right, `--sidebar: #e4e6ec`)

### 7.5 Home page
- 5 stat cards (Total, Drafts, Scheduled, Published, Failed) — grid `grid-cols-2 md:grid-cols-5`
- Postproxy usage bar (color-coded: green < 50%, amber < 80%, red >= 80%)
- Quick action buttons (Create Post, View Queue, Calendar)
- Recent posts list (top 5) with platform badges

### 7.6 Create page (4-step wizard)
Rectangular tabs (`rounded-lg px-2.5 py-2`):
- **Active**: `neu-inset-sm bg-emerald-600 text-white`
- **Done**: `neu-inset-sm text-emerald-700`
- **Pending**: `neu-button text-slate-400`

**Step 1 — Topic**: Platform toggle badges → topic input → tone select → custom instructions → Generate button
**Step 2 — Preview**: Edit headline/body/hashtags → character limits per platform → regenerate with tone/instructions
**Step 3 — Media**: Image (AI gen or upload) OR Video (JSON2Video or Remotion, style picker, bg source, voiceover, side-by-side comparison)
**Step 4 — Publish**: Preview card → schedule picker → Publish Now / Schedule / Save Draft → Postproxy limit warning

### 7.7 Queue page
- List all content items with headline, body excerpt, platform badges, status
- Publish (draft/failed only), Delete actions
- Uses `neu-card-sm` for post items

### 7.8 Calendar page
- Custom grid calendar, month nav (prev/next buttons)
- Today highlighted with `neu-inset-sm ring-2 ring-emerald-400/50`
- Day cells show up to 3 posts, "+N more" overflow
- Sheet drawer with full post details on click

### 7.9 Settings page
- Disabled inputs showing Supabase URL/anon key
- Inputs for OpenRouter, Cloudflare, Postproxy keys (save shows toast)
- Tone preference selector
- Postproxy setup guide

---

## Phase 8: Final Steps

### 8.1 Start scheduler
In `src/app/layout.tsx`, add a client component that calls `startScheduler()` on mount:
```tsx
"use client";
import { useEffect } from "react";
import { startScheduler } from "@/lib/scheduler";

export function SchedulerInit() {
  useEffect(() => { startScheduler(); return () => stopScheduler(); }, []);
  return null;
}
```

### 8.2 Verify builds
```bash
npm run build    # Must pass with no errors
npm run lint     # Must pass
```

### 8.3 Verify Postproxy connections
- Go to postproxy.dev → verify profile group has all 6 platforms connected
- Run app → Settings page shows connected platforms

### 8.4 Verify Remotion rendering
- Ensure Chrome is installed at default path
- Or set `REMOTION_BROWSER_EXECUTABLE` env var
- First render will be slow (~2-5min)

---

## File Creation Order (dependency-safe)
1. `src/types/index.ts`
2. `src/lib/utils.ts`
3. `src/lib/supabase.ts`
4. `src/lib/supabase-server.ts`
5. `src/lib/db.ts`
6. `src/lib/ai.ts`
7. `src/lib/images.ts`
8. `src/lib/video-types.ts`
9. `src/lib/video-json2video.ts`
10. `src/lib/video-remotion.ts`
11. `src/lib/publisher.ts`
12. `src/lib/scheduler.ts`
13. `src/app/globals.css`
14. `src/app/layout.tsx`
15. `src/middleware.ts`
16. `src/remotion/**` (4 templates + Root + index)
17. `src/workers/remotion-worker.ts`
18. `src/app/api/**` (10 route handlers)
19. `src/app/(auth)/**` (login, register, layout)
20. `src/app/(dashboard)/**` (layout, home, create, queue, calendar, settings)

## Gotchas
- **Supabase RLS**: Must be disabled; `createClient` with anon key will fail if RLS enabled without policies
- **Next.js 16 cookies**: `cookies()` is async; route handlers use `createClient` (sync), not `createServerClient`
- **`as any` cast**: Required on all `supabase.from("content_items")` calls because TypeScript doesn't know the table schema
- **Remotion Chrome**: Windows path is `C:\Program Files\Google\Chrome\Application\chrome.exe`; falls back to Puppeteer's bundled Chromium
- **Postproxy quota**: 10 cross-posts/month; `/api/postproxy-usage` returns `months[]` for month-aware scheduling
- **Video duration**: Both engines cap at 10s max; JSON2Video polls every 2s (180s timeout)
- **Middleware matcher**: Must exclude `_next/static`, `_next/image`, `favicon.ico` to avoid infinite loops
