# Social Post Automation

AI-powered social media content creation and cross-platform publishing tool. Generate text, images, and videos with AI, then publish or schedule across multiple platforms simultaneously — all from a single dashboard.

## Features

- **AI Text Generation** — Generate social media posts from a topic using free OpenRouter models (auto-discovers free models)
- **AI Image Generation** — Choose between two engines:
  - Cloudflare Workers AI (Stable Diffusion XL)
  - OpenRouter free image models (FLUX, etc.)
- **AI Video Generation** — Two engines:
  - JSON2Video (cloud, ~30s render, animated text + TTS)
  - Remotion (local Chromium, cinematic quality)
- **Upload Your Own Media** — Upload existing images or videos to include in posts
- **Cross-Platform Publishing** — Publish to X (Twitter), LinkedIn, Facebook, Instagram, Pinterest, and Threads simultaneously via Postproxy
- **Scheduling** — Schedule posts for future dates with auto-publish every 30s
- **Calendar View** — See scheduled posts on a calendar
- **Queue Management** — Review, edit, and manage all your posts
- **Dashboard** — Stats overview of your content pipeline

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **UI** | shadcn/ui + Tailwind CSS 4 (Neumorphism design) |
| **Auth & Database** | Supabase (PostgreSQL) |
| **Text AI** | OpenRouter free tier (dynamic model discovery) |
| **Image AI** | Cloudflare Workers AI (Stable Diffusion XL) + OpenRouter free image models |
| **Video AI** | JSON2Video (cloud) + Remotion (local) |
| **Publishing** | Postproxy (unified cross-platform API) |
| **Font** | Inter (sans-serif) |

## Prerequisites

- **Node.js** v20+
- **npm**
- **Supabase account** — for auth and database
- **OpenRouter API key** — free tier works (text + optional image generation)
- **Cloudflare Workers AI** — for image generation (free tier available)
- **Postproxy account** — for cross-platform publishing (free tier: 10 posts/month)
- **JSON2Video API key** — for cloud video generation (optional)
- **Chromium** — for Remotion local video rendering (optional; only needed if using Remotion)

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/VK-9/social-post-automation.git
cd social-post-automation
npm install
```

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous API key |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key (text gen) |
| `CLOUDFLARE_API_TOKEN` | No* | Cloudflare API token (image gen) |
| `CLOUDFLARE_ACCOUNT_ID` | No* | Cloudflare account ID |
| `POSTPROXY_API_KEY` | No* | Postproxy API key (publishing) |
| `POSTPROXY_PROFILE_GROUP_ID` | No* | Postproxy profile group |
| `POSTPROXY_PROFILE_IDS` | No* | Comma-separated profile IDs |
| `JSON2VIDEO_API_KEY` | No | JSON2Video API key (video gen) |

\* Required only if you want to use that feature.

### 3. Set Up Database

Run the following SQL in your Supabase Dashboard's SQL editor:

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

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to the login page — sign up to create an account.

## Usage

### Creating a Post

1. **Topic** — Enter a topic or idea for your post
2. **Preview** — AI generates post text based on your topic. Choose tone (Professional, Casual, Formal, Playful, Human, or Custom), select target platforms, add hashtags
3. **Media** — Optionally add an image or video:
   - **Image**: Generate with AI (Cloudflare or OpenRouter) or upload your own
   - **Video**: Generate with AI (JSON2Video or Remotion) or upload your own
4. **Publish** — Publish now (cross-posts to all selected platforms) or schedule for later

### Scheduling

- Posts scheduled for future dates are stored in the database
- A background check runs every 30 seconds, publishing due posts automatically
- Track your Postproxy usage (shown on the publish step)

### Viewing Posts

- **Dashboard** (`/home`) — Stats and quick overview
- **Queue** (`/queue`) — All posts with status filters (draft, scheduled, published)
- **Calendar** (`/calendar`) — Scheduled posts on a monthly calendar

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | Lint check |

## Project Structure

```
src/
├── app/
│   ├── (auth)/            # Login & register pages
│   │   ├── login/
│   │   ├── register/
│   │   └── auth-svg.tsx   # Animated SVG for auth layout
│   ├── (dashboard)/       # Home, create, queue, calendar, settings
│   │   ├── create/
│   │   ├── home/
│   │   ├── queue/
│   │   ├── calendar/
│   │   └── settings/
│   └── api/               # 11 route handlers
│       ├── connected-platforms/
│       ├── content/
│       ├── generate/
│       ├── generate-image/
│       ├── generate-video/
│       ├── postproxy-usage/
│       ├── publish/
│       ├── schedule/
│       └── upload/
├── components/ui/         # shadcn/ui components
├── lib/
│   ├── ai.ts              # OpenRouter text + image model discovery & text generation
│   ├── images.ts          # Cloudflare + OpenRouter image generation
│   ├── db.ts              # Supabase server client
│   ├── publisher.ts       # Postproxy API integration
│   ├── scheduler.ts       # Auto-publish background check (30s interval)
│   ├── supabase.ts        # Client-side Supabase
│   ├── supabase-server.ts # Server component Supabase
│   ├── video-json2video.ts # JSON2Video API
│   ├── video-remotion.ts   # Remotion video render
│   └── video.ts            # FFmpeg fallback (unused)
├── remotion/              # Remotion templates
│   ├── templates/
│   │   ├── Minimal.tsx
│   │   ├── QuoteCard.tsx
│   │   ├── StoryMode.tsx
│   │   └── Slideshow.tsx
│   ├── Root.tsx
│   └── index.ts
├── workers/
│   └── remotion-worker.ts # Standalone Remotion render script
└── middleware.ts          # Route protection
```

## Architecture Notes

- **Auth**: Supabase-only (no NextAuth). Client uses `createBrowserClient`, server routes use `createClient` (not `createServerClient`) to avoid cookies() issues in Next.js 16 route handlers
- **RLS**: Disabled on all tables — the app uses server-side API routes for all database access
- **AI Model Discovery**: On first request, dynamically fetches free models from OpenRouter `/api/v1/models` (cached for 5 minutes). Falls back to known-free models if the API fails. Same discovery works for both text and image models
- **Publishing**: All 6 platforms are published in a single Postproxy API call. Free tier is 10 cross-posts/month
- **Scheduling**: Simple in-process `setInterval` polling every 30s — no external cron or queue system

## License

Private — not open source (yet).
