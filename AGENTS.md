# Social Post Automation

## Stack (Actual)
- **Framework**: Next.js 16.2.10 (App Router)
- **UI**: shadcn/ui + Tailwind CSS 4 — **Neumorphism** design (`neu-card`, `neu-inset`, `neu-button` utilities in `globals.css`)
- **Auth + DB**: Supabase (PostgreSQL) — `@supabase/supabase-js`, `@supabase/ssr`
- **Text AI**: OpenRouter free tier — dynamically discovers free text models via `/api/v1/models` (filters `pricing.prompt === 0 && pricing.completion === 0`), cached for 5min; falls back to known-free models if API fails; retries through all free models on failure
- **Image AI**: Cloudflare Workers AI (Stable Diffusion XL) **default** + OpenRouter free image models as **optional engine**. User picks in the create UI. OpenRouter image gen discovers free image models from `/api/v1/models` (filters `architecture.modality === "image"` or `"text->image"`)
- **Video**: JSON2Video (cloud) primary + Remotion (local Chromium) secondary; users can also **upload their own video** instead of AI-generating
- **Publishing**: Postproxy free tier (10 cross-posts/month, all 6 platforms)
- **Scheduling**: In-process `setInterval` checking every 30s (no cron/queue)
- **Font**: Inter (sans-serif)

## Commands
```bash
npm run dev       # Start dev server (Turbopack)
npm run build     # Production build
npm run lint      # Lint check
```

## Env Variables (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://adbbpulxbcqqxrzewgaq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENROUTER_API_KEY=sk-or-...
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
POSTPROXY_API_KEY=...
POSTPROXY_PROFILE_GROUP_ID=...
POSTPROXY_PROFILE_IDS=...
JSON2VIDEO_API_KEY=...
```

## Database (Supabase `content_items` table)

Created via Supabase Dashboard SQL editor, **no migration files exist**.

```sql
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
```

Also requires `public.users` table + trigger for new user signup:
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
```

## Key Architecture Decisions

### Auth: Supabase only
- No NextAuth, no SQLite, no Docker
- Client-side: `supabase.auth.getUser()` / `supabase.auth.signOut()` from `@/lib/supabase`
- Server-side: `getServerSupabase()` from `@/lib/db` — uses **`createClient`** (not `createServerClient`) because RLS is disabled, avoiding `cookies()` incompatibility in Next.js 16 route handlers
- Middleware: `createServerClient` for route protection (redirects unauthenticated users to `/login`)

### Supabase client: direct `createClient` for API routes
- `getServerSupabase()` returns `ReturnType<typeof createClient>` — sync, no cookies
- All route handlers use `as any` cast on `supabase.from("content_items")` calls
- RLS disabled on all tables

### Design: Neumorphism
- `bg-background: #eef0f4` (soft warm neutral)
- Cards (`neu-card`): same bg as page, depth via `box-shadow` only — no borders
- Inputs (`neu-inset`): inner shadow for pressed-into-page look
- Segmented controls / tabs: `neu-inset-sm p-0.5` container with active item having `neu-inset-sm bg-white shadow-xs`
- Buttons: emerald-filled for primary CTAs (`bg-emerald-600 hover:bg-emerald-700 text-white`), `neu-button` for outline/secondary
- No glassmorphism, no borders on cards

### Auth page: split layout with animated SVG
- Desktop: SVG left (`w-2/5`), sign-in card right (`w-3/5`) — both centered with equal padding (`px-16`)
- Mobile: SVG above sign-in card in a stacked column, scrollable (SVG `h-[34vh] min-h-[240px]`)
- SVG (`auth-svg.tsx`) shows a social media network visualization: central hub with 6 platform nodes. Animated: trails flow from hub to nodes, nodes drift gently via `animateTransform`, lines draw on load. Gray line-art (`#94a3b8`), low contrast. Non-scaling strokes for consistent pixel widths across container sizes.
- Auth layout uses `bg-background` (was `bg-zinc-50`) — matches dashboard pages.

### Text AI: dynamic free model discovery
- `src/lib/ai.ts` calls OpenRouter `/api/v1/models` on first request, caches for 5min
- Filters text models where `pricing.prompt === "0" && pricing.completion === "0"` AND `architecture.modality` includes `"text"`
- Falls back to hardcoded list (`meta-llama/llama-3.1-8b-instruct`, `mistralai/mistral-7b-instruct`, `qwen/qwen-2.5-7b-instruct`) if API fails or returns empty
- Iterates through all found free models on failure (rate limit, 5xx, etc.)
- Same function also discovers free **image** models (filtered by `modality === "image"` or `"text->image"`), used by `images.ts`

### Image AI: dual engine
- **Cloudflare** (default): Stable Diffusion XL via `@cf/stabilityai/stable-diffusion-xl-base-1.0`
- **OpenRouter** (optional): iterates through free image models discovered from `/api/v1/models`, sends prompt via `/chat/completions`, extracts result from Markdown image link, plain URL, or inline base64 data URL
- User selects engine via a segmented toggle in the Media tab
- `src/lib/images.ts` exports `generateImage(prompt, engine)` — defaults to Cloudflare, falls back if OpenRouter has free models

### Create page Media tab layout
- **Media type**: segmented toggle (Image / Video)
- **Source** (per type): segmented toggle (Generate with AI / Upload)
- **Image AI**: prompt textarea with Enhance button, engine toggle (Cloudflare / OpenRouter), generate CTA (emerald-filled), result preview with Regenerate overlay button
- **Image Upload**: click-to-upload area, shows image preview with Replace button
- **Video AI**: engine toggle (JSON2Video / Remotion), prompt textarea, style/template grid selector, background source toggle (Auto / Color / Upload / AI Image), voiceover checkbox, generate CTA, result cards with Use This / Regen controls
- **Video Upload**: click-to-upload area accepting `video/*`, shows preview with controls and Replace button

### Video: dual engine + upload
- **JSON2Video** (default, cloud): ~30-60s render, animated text + TTS, `api.json2video.com/v2`
- **Remotion** (alternative, local): ~2-5min render, Chromium required, cinematic quality
- Both cap duration at 10s max
- Remotion isolated as child process (`npx tsx src/workers/remotion-worker.ts`) via temp JSON files to avoid Windows shell quoting
- Users can also **upload existing video** instead of AI-generating — `handleUpload(file, "video")` saves to `/public/` and sets `uploadedVideoUrl`
- Publish flow uses `finalVideoUrl = videoSource === "upload" ? uploadedVideoUrl : videoUrl`

### Postproxy: unified publishing
- Single cross-post counts as 1 post on free tier (10/month)
- All 6 platforms in one API call: `POST https://api.postproxy.dev/v1/posts`
- Usage tracked via `/api/postproxy-usage` which returns `months[]` for 3-month dynamic scheduling messages

### Unused dependencies (safe to remove but harmless)
- `zustand` — all state managed via `useState`
- `@libsql/client` — SQLite/Turso never used; data.db files exist from abandoned experiment
- `src/lib/video.ts` — FFmpeg-based fallback, superseded by JSON2Video/Remotion
- `src/lib/video-remotion-worker.ts` — older duplicate of `src/workers/remotion-worker.ts`

## File Structure
```
src/
├── app/
│   ├── (auth)/login, /register              # Auth pages
│   ├── (auth)/auth-svg.tsx                  # Animated gray-line SVG for auth pages
│   ├── (dashboard)/home, create, queue, calendar, settings
│   └── api/                                 # 11 route handlers
├── components/ui/                           # shadcn/ui components
├── lib/
│   ├── supabase.ts                          # Client-side Supabase (createBrowserClient)
│   ├── supabase-server.ts                   # Server component Supabase (createServerClient)
│   ├── db.ts                                # getServerSupabase() + getUserId()
│   ├── ai.ts                                # OpenRouter text + image model discovery + text gen
│   ├── images.ts                            # Cloudflare + OpenRouter image generation
│   ├── video-types.ts                       # Shared video types
│   ├── video-json2video.ts                  # JSON2Video API integration
│   ├── video-remotion.ts                    # Spawns Remotion worker
│   ├── video.ts                             # FFmpeg fallback (unused)
│   ├── publisher.ts                         # Postproxy API
│   └── scheduler.ts                         # Auto-publish every 30s
├── remotion/
│   ├── index.ts                             # registerRoot(Root)
│   ├── Root.tsx                             # 4 compositions (minimal, quote-card, story-mode, slideshow)
│   └── templates/{Minimal,QuoteCard,StoryMode,Slideshow}.tsx
└── workers/
    └── remotion-worker.ts                   # Standalone render script
└── middleware.ts                            # Route protection
```

## Flow
1. User signs up/in via Supabase Auth → auto-inserted into `public.users` via trigger
2. Creates post in `/create` wizard (4 rectangular tabs: Topic → Preview → Media → Publish)
3. AI generates text (OpenRouter) → optional image (Cloudflare or OpenRouter) → optional video (JSON2Video/Remotion or upload own)
4. User publishes now → `POST /api/publish` → Postproxy cross-posts to all platforms
5. User schedules → `POST /api/schedule` → `src/lib/scheduler.ts` polls every 30s and publishes when due
6. Dashboard shows stats, queue shows all items, calendar shows scheduled items
