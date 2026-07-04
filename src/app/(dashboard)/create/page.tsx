"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Sparkles, Image, Video, Send, Calendar as CalendarIcon,
  Loader2, X, Wand2, RefreshCw, Upload, AlertCircle, HelpCircle, Clock, CheckCircle2,
  Eye, Trash2, Check
} from "lucide-react";

const ALL_PLATFORMS = [
  { id: "twitter", label: "X (Twitter)", color: "bg-black text-white", charLimit: 280 },
  { id: "linkedin", label: "LinkedIn", color: "bg-blue-600 text-white", charLimit: 3000 },
  { id: "facebook", label: "Facebook", color: "bg-blue-500 text-white", charLimit: 63206 },
  { id: "instagram", label: "Instagram", color: "bg-pink-500 text-white", charLimit: 2200 },
  { id: "pinterest", label: "Pinterest", color: "bg-red-500 text-white", charLimit: 500 },
  { id: "threads", label: "Threads", color: "bg-black text-white", charLimit: 500 },
];

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "casual", label: "Casual" },
  { id: "formal", label: "Formal" },
  { id: "playful", label: "Playful" },
  { id: "human", label: "Human" },
  { id: "custom", label: "Custom..." },
];

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger className="inline-flex cursor-help">
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64 text-xs leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function parseHashtags(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#+/, "").trim())
    .filter(Boolean);
}

function HashtagInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [input, setInput] = useState("");
  const tags = parseHashtags(value);

  const addTag = useCallback(() => {
    const cleaned = input.replace(/^#+/, "").trim();
    if (!cleaned) return;
    const existing = new Set(tags.map((t) => t.toLowerCase()));
    if (existing.has(cleaned.toLowerCase())) {
      toast.error("Hashtag already added");
      setInput("");
      return;
    }
    const next = [...tags, cleaned].join(" ");
    onChange(next);
    setInput("");
  }, [input, tags, onChange]);

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag).join(" "));
  };

  return (
    <div className="space-y-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pl-2 pr-1 text-xs">
              <span>#{tag}</span>
              <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive transition-colors">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); addTag(); } }}
          placeholder="Type a hashtag and press Enter..."
          className="h-9 text-sm"
        />
        <Button type="button" size="sm" variant="outline" onClick={addTag} disabled={!input.trim()}>Add</Button>
      </div>
    </div>
  );
}

function PlatformCharLimit({ platforms, text, headline }: { platforms: string[]; text: string; headline?: string }) {
  if (platforms.length === 0 || platforms.includes("all")) return null;
  const relevant = ALL_PLATFORMS.filter((p) => platforms.includes(p.id));

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Character limits</p>
      {relevant.map((p) => {
        const totalLen = (headline ? headline.length + 1 : 0) + text.length;
        const over = totalLen > p.charLimit;
        return (
          <div key={p.id} className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${p.color} bg-opacity-20`}>{p.label}</Badge>
            <span className={over ? "text-destructive font-semibold" : "text-muted-foreground"}>
              {totalLen}/{p.charLimit}
              {over && " (exceeded)"}
            </span>
            {p.id === "linkedin" && (
              <span className="text-[10px] text-muted-foreground ml-1">headline+body</span>
            )}
            {p.id === "facebook" && (
              <span className="text-[10px] text-muted-foreground ml-1">message</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CreatePostPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [platforms, setPlatforms] = useState<string[]>(["all"]);
  const [topic, setTopic] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [tone, setTone] = useState("professional");
  const [customToneText, setCustomToneText] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [headline, setHeadline] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [json2videoUrl, setJson2videoUrl] = useState("");
  const [remotionUrl, setRemotionUrl] = useState("");
  const [json2videoRenderTime, setJson2videoRenderTime] = useState(0);
  const [remotionRenderTime, setRemotionRenderTime] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[] | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [imagePrompt, setImagePrompt] = useState("");
  const [json2videoPrompt, setJson2videoPrompt] = useState("");
  const [remotionPrompt, setRemotionPrompt] = useState("");
  const [videoColor, setVideoColor] = useState("#1a1a2e");
  const [postproxyUsed, setPostproxyUsed] = useState(0);
  const [postproxyLimit, setPostproxyLimit] = useState(10);
  const [postproxyRemaining, setPostproxyRemaining] = useState(10);
  const [resetDate, setResetDate] = useState("");
  const [months, setMonths] = useState<any[]>([]);
  const [enhancing, setEnhancing] = useState(false);
  const [regenInstructions, setRegenInstructions] = useState("");

  const [imageSource, setImageSource] = useState<"ai" | "upload">("ai");
  const [imageEngine, setImageEngine] = useState<"cloudflare" | "openrouter">("cloudflare");
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [videoSource, setVideoSource] = useState<"ai" | "upload">("ai");
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState("");
  const [videoBgSource, setVideoBgSource] = useState<"auto" | "color" | "upload" | "ai">("auto");
  const [videoEngine, setVideoEngine] = useState<"json2video" | "remotion">("json2video");
  const [videoStyle, setVideoStyle] = useState("minimal");
  const [remotionTemplate, setRemotionTemplate] = useState("minimal");
  const [voiceoverEnabled, setVoiceoverEnabled] = useState(false);
  const [uploadedBgUrl, setUploadedBgUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/login");
      else setUserId(user.id);
    });
  }, [router]);

  useEffect(() => {
    fetch("/api/connected-platforms")
      .then((r) => r.json())
      .then((d) => setConnectedPlatforms(d.platforms));
    fetchPostproxyUsage();
  }, []);

  function fetchPostproxyUsage() {
    fetch("/api/postproxy-usage")
      .then((r) => r.json())
      .then((d) => {
        setPostproxyUsed(d.used);
        setPostproxyLimit(d.limit);
        setPostproxyRemaining(d.remaining);
        setResetDate(d.resetDate);
        setMonths(d.months || []);
      });
  }

  useEffect(() => {
    if (mediaType === "image") {
      setImagePrompt(`${topic} - social media post`);
    }
  }, [topic, mediaType]);

  if (!userId) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const effectiveTone = tone === "custom" && customToneText.trim() ? customToneText.trim() : tone;

  const available = connectedPlatforms === null
    ? ALL_PLATFORMS
    : ALL_PLATFORMS.filter((p) => connectedPlatforms.includes(p.id));

  const ppPercent = postproxyLimit > 0 ? Math.round((postproxyUsed / postproxyLimit) * 100) : 0;

  function togglePlatform(id: string) {
    setPlatforms((prev) => {
      if (id === "all") return ["all"];
      const withoutAll = prev.filter((p) => p !== "all");
      if (withoutAll.includes(id)) {
        const next = withoutAll.filter((p) => p !== id);
        return next.length === 0 ? ["all"] : next;
      }
      return [...withoutAll, id];
    });
  }

  async function handleUpload(file: File, type: "image" | "bg" | "video"): Promise<string | null> {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (type === "image") setUploadedImageUrl(data.url);
      else if (type === "bg") setUploadedBgUrl(data.url);
      else setUploadedVideoUrl(data.url);
      return data.url;
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerate(overrideTone?: string, overrideInstructions?: string) {
    if (!topic) { toast.error("Enter a topic first"); return; }
    setGenerating(true);
    try {
      const effectivePlatforms = platforms.includes("all") ? "all" : platforms.join(",");
      const hasLinkedIn = platforms.includes("all") || platforms.includes("linkedin");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: effectivePlatforms,
          topic,
          tone: overrideTone || effectiveTone,
          customInstructions: overrideInstructions || customInstructions,
          generateHeadline: hasLinkedIn,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeneratedText(data.body);
      if (data.headline) setHeadline(data.headline);
      const rawHashtags = data.hashtags;
      setHashtags(Array.isArray(rawHashtags) ? rawHashtags.join(" ") : (rawHashtags || ""));
      setStep(2);
      setMaxStep(2);
      toast.success("Post generated!");
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
    }
    setGenerating(false);
  }

  async function handleEnhancePrompt() {
    setEnhancing(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "image-generation",
          topic: `Make this prompt more detailed and visually descriptive for AI image generation: "${imagePrompt}"`,
          tone: "descriptive",
          customInstructions: "Return only the enhanced prompt as JSON with key 'body'. No markdown, no extra text.",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const enhanced = data.body
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .replace(/^"(.*)"$/, "$1")
        .trim();
      if (enhanced) setImagePrompt(enhanced);
      toast.success("Prompt enhanced!");
    } catch (err: any) {
      toast.error(err.message || "Prompt enhancement failed");
    }
    setEnhancing(false);
  }

  async function handleGenerateImage() {
    if (!imagePrompt) { toast.error("Enter an image prompt first"); return; }
    setGeneratingImage(true);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imagePrompt, engine: imageEngine }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setImageUrl(data.imageUrl);
      setMaxStep(3);
      toast.success("Image generated!");
    } catch (err: any) {
      toast.error(err.message || "Image generation failed");
    }
    setGeneratingImage(false);
  }

  async function handleGenerateVideo() {
    if (!generatedText) { toast.error("Generate post text first"); return; }
    setGeneratingVideo(true);
    toast.info(`Rendering video with ${videoEngine === "json2video" ? "JSON2Video" : "Remotion"}...`);
    const startTime = Date.now();
    try {
      const bgImage = videoBgSource === "upload" ? uploadedBgUrl
        : videoBgSource === "ai" ? imageUrl : null;
      const promptText = videoEngine === "json2video" ? (json2videoPrompt || generatedText) : (remotionPrompt || generatedText);
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: promptText,
          hashtags,
          topic,
          engine: videoEngine,
          style: videoEngine === "remotion" ? remotionTemplate : videoStyle,
          bgSource: videoBgSource,
          bgColor: videoBgSource === "color" ? videoColor : undefined,
          bgImageUrl: bgImage,
          voiceover: voiceoverEnabled,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (videoEngine === "json2video") {
        setJson2videoUrl(data.videoUrl);
        setJson2videoRenderTime(parseFloat(elapsed));
        if (!videoUrl) setVideoUrl(data.videoUrl);
      } else {
        setRemotionUrl(data.videoUrl);
        setRemotionRenderTime(parseFloat(elapsed));
        if (!videoUrl) setVideoUrl(data.videoUrl);
      }

      setMaxStep(3);
      toast.success(`Video generated! (${elapsed}s)`);
    } catch (err: any) {
      toast.error(err.message || "Video generation failed");
    }
    setGeneratingVideo(false);
  }

  async function handleSaveDraft() {
    if (!generatedText) { toast.error("Generate post text first"); return; }
    const finalImageUrl = mediaType === "image"
      ? (imageSource === "upload" ? uploadedImageUrl : imageUrl) || null
      : null;
    const finalVideoUrl = mediaType === "video"
      ? (videoSource === "upload" ? uploadedVideoUrl : videoUrl) || null
      : null;

    const effectivePlatforms = platforms.includes("all") ? ALL_PLATFORMS.map(p => p.id).join(",") : platforms.join(",");

    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          platforms: effectivePlatforms,
          topic,
          body: generatedText,
          headline: headline || null,
          hashtags,
          imageUrl: finalImageUrl,
          videoUrl: finalVideoUrl,
          aiModel: "llama-3.1-8b",
          status: "draft",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success("Post saved as draft!");
      router.push("/queue");
    } catch (err: any) {
      toast.error(err.message || "Failed to save draft");
    }
  }

  async function handlePublish(now: boolean) {
    if (!generatedText) { toast.error("Generate post text first"); return; }

    const finalImageUrl = mediaType === "image"
      ? (imageSource === "upload" ? uploadedImageUrl : imageUrl) || null
      : null;
    const finalVideoUrl = mediaType === "video"
      ? (videoSource === "upload" ? uploadedVideoUrl : videoUrl) || null
      : null;

    const effectivePlatforms = platforms.includes("all") ? ALL_PLATFORMS.map(p => p.id).join(",") : platforms.join(",");

    const isScheduling = !!scheduleDate;

    if (isScheduling) {
      const schedMonth = new Date(scheduleDate).getMonth();
      const schedYear = new Date(scheduleDate).getFullYear();
      const now2 = new Date();
      const monthDiff = (schedYear - now2.getFullYear()) * 12 + (schedMonth - now2.getMonth());

      if (monthDiff === 0 && postproxyRemaining <= 0) {
        const nextReset = months[1]?.label || "next month";
        toast.error(`Postproxy limit reached for this month. You can schedule for ${nextReset} onwards.`);
        return;
      }
    }

    try {
      const contentRes = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          platforms: effectivePlatforms,
          topic,
          body: generatedText,
          headline: headline || null,
          hashtags,
          imageUrl: finalImageUrl,
          videoUrl: finalVideoUrl,
          aiModel: "llama-3.1-8b",
          status: isScheduling ? "scheduled" : (now ? "draft" : "draft"),
          scheduledAt: scheduleDate || null,
        }),
      });

      const content = await contentRes.json();
      if (!contentRes.ok) throw new Error(content.error);

      if (now && !isScheduling) {
        const publishRes = await fetch("/api/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId: content.id }),
        });
        if (!publishRes.ok) {
          const err = await publishRes.json();
          throw new Error(err.error || "Publish failed");
        }
        toast.success("Post published successfully!");
        fetchPostproxyUsage();
      } else if (isScheduling) {
        const schedRes = await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId: content.id, scheduledAt: scheduleDate }),
        });
        if (!schedRes.ok) throw new Error("Schedule failed");
        toast.success("Post scheduled! View it in Content Queue.");
        fetchPostproxyUsage();
        router.push("/queue");
      } else {
        toast.success("Post saved as draft!");
      }
      setStep(4);
    } catch (err: any) {
      toast.error(err.message || "Failed to save post");
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 sm:space-y-8 px-0 sm:px-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">Create Post</h1>
          <p className="text-sm sm:text-base text-slate-400 mt-1">Generate AI-powered social media content in 4 easy steps</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
          {postproxyRemaining > 0 && postproxyRemaining <= 3 && (
            <Badge variant="destructive" className="gap-1.5 px-3 py-1.5 text-xs font-medium shadow-xs">
              <AlertCircle className="h-3.5 w-3.5" />
              Only {postproxyRemaining} left this month
            </Badge>
          )}
          <Badge
            variant={ppPercent >= 80 ? "destructive" : ppPercent >= 50 ? "secondary" : "outline"}
            className="gap-1.5 px-3 py-1.5 text-xs font-medium shadow-xs"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            Postproxy: {postproxyUsed}/{postproxyLimit}
          </Badge>
        </div>
      </div>

      <Tabs value={`step-${step}`} onValueChange={(v) => { const s = Number(v.replace("step-", "")); if (s <= maxStep) setStep(s); }} className="w-full">
        <div className="flex w-full mb-4 gap-1.5 sm:gap-2.5">
          {[
            { num: 1, label: "Topic" },
            { num: 2, label: "Preview" },
            { num: 3, label: "Media" },
            { num: 4, label: "Publish" },
          ].map((s) => {
            const active = step === s.num;
            const done = step > s.num;
            const canClick = s.num <= maxStep;
            return (
              <button
                key={s.num}
                onClick={() => canClick && setStep(s.num)}
                disabled={!canClick}
                className={`flex-1 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2.5 text-center transition-all duration-300 ${
                  active
                    ? "neu-inset-sm bg-emerald-600 text-white shadow-xs"
                    : done
                    ? "neu-inset-sm text-emerald-700"
                    : "neu-button text-slate-400"
                } ${canClick ? "cursor-pointer" : "cursor-default"}`}
              >
                  <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                  <span className="text-[11px] sm:text-sm font-semibold">
                    {done ? <Check className="h-3.5 w-3.5 sm:h-[18px] sm:w-[18px]" /> : s.num}
                  </span>
                  <span className="text-[10px] sm:text-xs font-semibold">{s.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ===== STEP 1: TOPIC ===== */}
        <TabsContent value="step-1" className="space-y-5 mt-4">
          <Card className="neu-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base font-semibold text-slate-800 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 text-[11px] font-semibold px-1.5">1</span>
                Select Platforms
              </CardTitle>
            </CardHeader>
            <CardContent>
              {connectedPlatforms !== null && available.length === 0 ? (
                <p className="text-sm text-slate-500">No Postproxy profiles connected. Go to Settings to connect platforms.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Badge
                    className={`cursor-pointer transition-all px-3 py-1.5 text-xs ${platforms.includes("all") ? "ring-2 ring-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"}`}
                    variant="secondary"
                    onClick={() => togglePlatform("all")}
                  >
                    All Platforms
                  </Badge>
                  {available.map((p) => (
                    <Badge
                      key={p.id}
                      className={`cursor-pointer transition-all px-2.5 py-1 text-xs ${platforms.includes(p.id) ? "ring-2 ring-emerald-500 shadow-xs" : "opacity-60 hover:opacity-100"} ${p.color}`}
                      onClick={() => togglePlatform(p.id)}
                    >
                      {platforms.includes(p.id) && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {p.label}
                    </Badge>
                  ))}
                </div>
              )}
              {!platforms.includes("all") && platforms.length > 0 && (
                <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Selected: {platforms.map((id) => ALL_PLATFORMS.find((p) => p.id === id)?.label).join(", ")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="neu-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base font-semibold text-slate-800 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 text-[11px] font-semibold px-1.5">2</span>
                Post Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  Topic / Idea
                  <InfoTip text="The main subject of your post. Be specific for better results." />
                </Label>
                <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., AI trends in 2026, product launch announcement..." className="neu-inset h-11" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Tone</Label>
                <select className="flex h-11 w-full rounded-xl neu-inset bg-transparent px-3 py-2 text-sm font-medium text-slate-800" value={tone} onChange={(e) => setTone(e.target.value)}>
                  {TONES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                {tone === "custom" && (
                  <Input
                    value={customToneText}
                    onChange={(e) => setCustomToneText(e.target.value)}
                    placeholder="Describe the tone, e.g., 'inspirational and motivational with short punchy sentences'"
                    className="mt-1 h-11 neu-inset"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                  Custom Instructions (optional)
                  <InfoTip text="Extra guidance for the AI — specific points to include, things to avoid." />
                </Label>
                <Textarea value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} placeholder="e.g., Mention our new feature, include a quote from the CEO..." rows={3} className="neu-inset" />
              </div>

              <Separator className="bg-slate-200/60" />

              <Button onClick={() => handleGenerate()} disabled={generating || !topic} size="lg" className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20">
                {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4" /> Generate Post</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== STEP 2: PREVIEW ===== */}
        <TabsContent value="step-2" className="space-y-5 mt-6">
          <Card className="neu-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base font-semibold text-slate-800 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 text-[11px] font-semibold px-1.5">2</span>
                Generated Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {(platforms.includes("linkedin") || platforms.includes("all")) && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    Headline
                    <Badge variant="outline" className="text-[10px] px-1.5 border-blue-200 bg-blue-50 text-blue-700 font-medium">LinkedIn</Badge>
                  </Label>
                  <Input
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Attention-grabbing headline for LinkedIn..."
                    className="h-11 font-semibold neu-inset text-slate-800"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Post Body</Label>
                <Textarea value={generatedText} onChange={(e) => setGeneratedText(e.target.value)} rows={6} className="neu-inset text-slate-800 leading-relaxed" />
              </div>

              <PlatformCharLimit platforms={platforms} text={generatedText} headline={headline} />

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Hashtags</Label>
                <HashtagInput value={hashtags} onChange={setHashtags} />
              </div>

              <Separator className="bg-slate-200/60" />

              <div className="space-y-3 neu-card p-5">
                <Label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Regenerate</Label>
                <div className="flex gap-2">
                  <select
                    className="flex h-11 flex-1 rounded-xl neu-inset bg-transparent px-3 py-2 text-sm font-medium text-slate-800"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                  >
                    {TONES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  {tone === "custom" && (
                    <Input
                      value={customToneText}
                      onChange={(e) => setCustomToneText(e.target.value)}
                      placeholder="Describe your custom tone..."
                      className="flex-1 h-11 neu-inset"
                    />
                  )}
                  <Button variant="outline" onClick={() => handleGenerate(effectiveTone)} disabled={generating} className="neu-button gap-2 shrink-0">
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Regenerate
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Custom instructions for regen (optional)</Label>
                  <Textarea
                    value={regenInstructions}
                    onChange={(e) => setRegenInstructions(e.target.value)}
                    placeholder="e.g., Make it shorter, focus on the benefits, add a call to action..."
                    rows={2}
                    className="resize-none text-sm neu-inset"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGenerate(effectiveTone, regenInstructions)}
                    disabled={generating || !regenInstructions.trim()}
                    className="gap-1 text-xs h-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  >
                    <Sparkles className="h-3 w-3" /> Apply instructions & regen
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <Button variant="default" onClick={() => { setStep(3); setMaxStep(3); }} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/25">
                  <Image className="h-4 w-4" /> Add Media
                </Button>
                <Button variant="outline" onClick={() => { setStep(4); setMaxStep(4); }} className="gap-2 neu-button text-slate-700">
                  <Send className="h-4 w-4" /> Publish without Media
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== STEP 3: MEDIA ===== */}
        <TabsContent value="step-3" className="space-y-5 mt-6">
          <Card className="neu-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base font-semibold text-slate-800 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 text-[11px] font-semibold px-1.5">3</span>
                Media
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Media Type Tabs */}
              <div className="flex gap-1 neu-inset-sm p-1">
                <button
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    mediaType === "image"
                      ? "neu-inset-sm text-emerald-700 bg-white"
                      : "text-slate-500 hover:text-slate-700"}`}
                  onClick={() => setMediaType("image")}
                >
                  <Image className="h-4 w-4" /> Image
                </button>
                <button
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    mediaType === "video"
                      ? "neu-inset-sm text-emerald-700 bg-white"
                      : "text-slate-500 hover:text-slate-700"}`}
                  onClick={() => setMediaType("video")}
                >
                  <Video className="h-4 w-4" /> Video
                </button>
              </div>

              {mediaType === "image" ? (
                <>
                  {/* Image Source Tabs */}
                  <div className="flex gap-1 neu-inset-sm p-0.5">
                    <button
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        imageSource === "ai"
                          ? "neu-inset-sm text-emerald-700 bg-white shadow-xs"
                          : "text-slate-500 hover:text-slate-700"}`}
                      onClick={() => setImageSource("ai")}
                    >
                      Generate with AI
                    </button>
                    <button
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        imageSource === "upload"
                          ? "neu-inset-sm text-emerald-700 bg-white shadow-xs"
                          : "text-slate-500 hover:text-slate-700"}`}
                      onClick={() => setImageSource("upload")}
                    >
                      Upload Image
                    </button>
                  </div>

                  {imageSource === "ai" ? (
                    <>
                      {/* AI Image Section */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                          Image Prompt
                          <InfoTip text="Describe the image you want the AI to generate." />
                        </Label>
                        <div className="flex gap-2">
                          <Textarea
                            value={imagePrompt}
                            onChange={(e) => setImagePrompt(e.target.value)}
                            rows={2}
                            placeholder="e.g. A serene mountain landscape at sunset with vibrant colors..."
                            className="flex-1 resize-none neu-inset"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleEnhancePrompt}
                            disabled={enhancing}
                            className="shrink-0 self-start gap-1 neu-button"
                          >
                            {enhancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                            Enhance
                          </Button>
                        </div>
                      </div>

                      {/* Image Engine Tabs */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-medium">Engine</span>
                        <div className="flex gap-0.5 neu-inset-sm p-0.5">
                          <button
                            className={`text-xs px-3 py-1 rounded transition-all font-medium ${
                              imageEngine === "cloudflare"
                                ? "neu-inset-sm text-emerald-700 bg-white"
                                : "text-slate-400 hover:text-slate-600"}`}
                            onClick={() => setImageEngine("cloudflare")}
                          >
                            Cloudflare
                          </button>
                          <button
                            className={`text-xs px-3 py-1 rounded transition-all font-medium ${
                              imageEngine === "openrouter"
                                ? "neu-inset-sm text-emerald-700 bg-white"
                                : "text-slate-400 hover:text-slate-600"}`}
                            onClick={() => setImageEngine("openrouter")}
                          >
                            OpenRouter
                          </button>
                        </div>
                      </div>

                      {/* Generate / Result */}
                      {imageUrl ? (
                        <div className="relative">
                          <div className="flex items-center justify-center neu-inset-sm p-2 max-h-96 overflow-y-auto">
                            <img src={imageUrl} alt="Generated" className="w-full h-auto rounded object-contain" />
                          </div>
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setImageUrl(""); handleGenerateImage(); }}
                              disabled={generatingImage}
                              className="gap-1 bg-white/90 hover:bg-white shadow-xs border-slate-200"
                            >
                              {generatingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                              Regenerate
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={handleGenerateImage}
                          disabled={generatingImage || !imagePrompt}
                          className="w-full gap-2 py-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/25"
                        >
                          {generatingImage
                            ? <><Loader2 className="h-5 w-5 animate-spin" /> Generating Image...</>
                            : <><Sparkles className="h-5 w-5" /> Generate Image</>}
                        </Button>
                      )}
                    </>
                  ) : (
                    /* Upload Image Section */
                    <div className="space-y-3">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "image"); }}
                      />
                      {uploadedImageUrl ? (
                        <div className="relative">
                          <img src={uploadedImageUrl} alt="Uploaded" className="w-full max-h-72 rounded-lg object-cover border border-slate-200" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setUploadedImageUrl(""); imageInputRef.current?.click(); }}
                            className="absolute top-2 right-2 gap-1 bg-white/90 backdrop-blur-xs shadow-xs border-slate-200"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Replace
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => imageInputRef.current?.click()}
                          disabled={uploading}
                          className="w-full neu-inset-sm p-8 text-center text-sm text-slate-400 hover:text-slate-600 transition cursor-pointer disabled:opacity-50"
                        >
                          {uploading ? (
                            <><Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" /> Uploading...</>
                          ) : (
                            <><Upload className="mx-auto h-6 w-6 mb-2" /> Click to upload an image</>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Video Source Tabs */}
                  <div className="flex gap-1 neu-inset-sm p-0.5">
                    <button
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        videoSource === "ai"
                          ? "neu-inset-sm text-emerald-700 bg-white shadow-xs"
                          : "text-slate-500 hover:text-slate-700"}`}
                      onClick={() => setVideoSource("ai")}
                    >
                      Generate with AI
                    </button>
                    <button
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        videoSource === "upload"
                          ? "neu-inset-sm text-emerald-700 bg-white shadow-xs"
                          : "text-slate-500 hover:text-slate-700"}`}
                      onClick={() => setVideoSource("upload")}
                    >
                      Upload Video
                    </button>
                  </div>

                  {videoSource === "upload" ? (
                    /* Upload Video Section */
                    <div className="space-y-3">
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "video"); }}
                      />
                      {uploadedVideoUrl ? (
                        <div className="relative">
                          <video src={uploadedVideoUrl} controls className="w-full max-h-72 rounded-lg border border-slate-200" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setUploadedVideoUrl(""); videoInputRef.current?.click(); }}
                            className="absolute top-2 right-2 gap-1 bg-white/90 backdrop-blur-xs shadow-xs border-slate-200"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Replace
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => videoInputRef.current?.click()}
                          disabled={uploading}
                          className="w-full neu-inset-sm p-8 text-center text-sm text-slate-400 hover:text-slate-600 transition cursor-pointer disabled:opacity-50"
                        >
                          {uploading ? (
                            <><Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" /> Uploading...</>
                          ) : (
                            <><Upload className="mx-auto h-6 w-6 mb-2" /> Click to upload a video</>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    /* AI Video Generation Section */
                    <>
                      {/* Video Engine Tabs */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">Video Engine</Label>
                        <div className="flex gap-1 neu-inset-sm p-0.5">
                          <button
                            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                              videoEngine === "json2video"
                                ? "neu-inset-sm text-emerald-700 bg-white shadow-xs"
                                : "text-slate-500 hover:text-slate-700"}`}
                            onClick={() => setVideoEngine("json2video")}
                          >
                            JSON2Video
                          </button>
                          <button
                            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                              videoEngine === "remotion"
                                ? "neu-inset-sm text-emerald-700 bg-white shadow-xs"
                                : "text-slate-500 hover:text-slate-700"}`}
                            onClick={() => setVideoEngine("remotion")}
                          >
                            Remotion
                          </button>
                        </div>
                        <p className="text-xs text-slate-500">
                          {videoEngine === "json2video"
                            ? "Cloud ~30-60s. Max 10s duration. Animated text, TTS, subtitles."
                            : "Local ~2-5min. Max 10s duration. Full CSS, cinematic quality."}
                        </p>
                      </div>

                      {/* Video Prompt */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                          {videoEngine === "json2video" ? "JSON2Video" : "Remotion"} Prompt
                          <InfoTip text="Customize the text displayed in the video. Defaults to the post text if left empty." />
                        </Label>
                        <Textarea
                          value={videoEngine === "json2video" ? json2videoPrompt : remotionPrompt}
                          onChange={(e) => {
                            if (videoEngine === "json2video") setJson2videoPrompt(e.target.value);
                            else setRemotionPrompt(e.target.value);
                          }}
                          placeholder="Leave empty to use the post text, or write custom copy for the video..."
                          rows={2}
                          className="resize-none neu-inset"
                        />
                      </div>

                      {/* Style/Template selector */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          {videoEngine === "json2video" ? "Video Style" : "Template"}
                        </Label>
                        {videoEngine === "json2video" ? (
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: "minimal", label: "Minimal", desc: "Clean centered text" },
                              { id: "bold-quote", label: "Bold Quote", desc: "Large italic quote" },
                              { id: "cinematic", label: "Cinematic", desc: "Film-style with zoom" },
                              { id: "story", label: "Story", desc: "Instagram Story layout" },
                              { id: "gradient", label: "Gradient", desc: "Animated colors" },
                            ].map((s) => (
                              <button
                                key={s.id}
                                className={`neu-card-sm p-3 text-left text-sm transition-all ${
                                videoStyle === s.id ? "neu-inset-sm" : "hover:neu-inset-sm"}`}
                                onClick={() => setVideoStyle(s.id)}
                              >
                                <span className="font-medium">{s.label}</span>
                                <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: "minimal", label: "Minimal", desc: "Text fade-in on color" },
                              { id: "quote-card", label: "Quote Card", desc: "Serif quote with bg" },
                              { id: "story-mode", label: "Story Mode", desc: "Full-bleed story" },
                              { id: "slideshow", label: "Slideshow", desc: "Multi-slide sequence" },
                            ].map((t) => (
                              <button
                                key={t.id}
                                className={`neu-card-sm p-3 text-left text-sm transition-all ${
                                remotionTemplate === t.id ? "neu-inset-sm" : "hover:neu-inset-sm"}`}
                                onClick={() => setRemotionTemplate(t.id)}
                              >
                                <span className="font-medium">{t.label}</span>
                                <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Background source */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">Background</Label>
                        <div className="flex gap-1 neu-inset-sm p-0.5">
                          {[
                            { id: "auto" as const, label: "Auto" },
                            { id: "color" as const, label: "Color" },
                            { id: "upload" as const, label: "Upload" },
                            { id: "ai" as const, label: "AI Image" },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                                videoBgSource === opt.id
                                  ? "neu-inset-sm text-emerald-700 bg-white shadow-xs"
                                  : "text-slate-500 hover:text-slate-700"}`}
                              onClick={() => setVideoBgSource(opt.id)}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {videoBgSource === "color" && (
                        <div className="flex gap-3 items-center">
                          <input type="color" value={videoColor} onChange={(e) => setVideoColor(e.target.value)} className="h-10 w-10 rounded-lg border cursor-pointer shrink-0" />
                          <Input value={videoColor} onChange={(e) => setVideoColor(e.target.value)} className="w-28 font-mono text-xs h-10 neu-inset" />
                          <span className="text-xs text-muted-foreground">Background color</span>
                        </div>
                      )}

                      {videoBgSource === "upload" && (
                        <div className="space-y-3">
                          <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "bg"); }} />
                          {uploadedBgUrl ? (
                            <div className="relative">
                              <img src={uploadedBgUrl} alt="Background" className="w-full max-h-48 rounded-lg object-cover border border-slate-200" />
                              <Button variant="outline" size="sm" onClick={() => bgInputRef.current?.click()} className="absolute top-2 right-2 gap-1 bg-white/90 backdrop-blur-xs shadow-xs border-slate-200">
                                <Upload className="h-3.5 w-3.5" /> Replace
                              </Button>
                            </div>
                          ) : (
                            <button onClick={() => bgInputRef.current?.click()} disabled={uploading} className="w-full neu-inset-sm p-6 text-center text-sm text-muted-foreground hover:text-foreground transition cursor-pointer disabled:opacity-50">
                              {uploading ? <><Loader2 className="mx-auto h-5 w-5 animate-spin mb-1" /> Uploading...</> : <><Upload className="mx-auto h-5 w-5 mb-1" /> Upload background image</>}
                            </button>
                          )}
                        </div>
                      )}

                      {videoBgSource === "ai" && (
                        <div className="rounded-lg border bg-muted/30 p-4 text-center">
                          {imageUrl ? <img src={imageUrl} alt="AI background" className="max-h-48 rounded object-cover mx-auto border" /> : <p className="text-sm text-muted-foreground">Switch to Image mode to generate an AI image first.</p>}
                        </div>
                      )}

                      {/* Voiceover */}
                      {videoEngine === "json2video" && (
                        <label className="flex items-center gap-2 neu-card-sm cursor-pointer hover:neu-inset-sm transition-all p-3">
                          <input type="checkbox" checked={voiceoverEnabled} onChange={(e) => setVoiceoverEnabled(e.target.checked)} className="h-4 w-4 accent-primary" />
                          <div className="text-sm">
                            <span className="font-medium">AI Voiceover</span>
                            <p className="text-xs text-muted-foreground">TTS reads the post aloud</p>
                          </div>
                        </label>
                      )}

                      {/* Generate CTA */}
                      {!json2videoUrl && !remotionUrl && (
                        <Button
                          onClick={handleGenerateVideo}
                          disabled={generatingVideo || !generatedText}
                          className="w-full gap-2 py-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/25"
                        >
                          {generatingVideo
                            ? <><Loader2 className="h-5 w-5 animate-spin" /> Rendering Video...</>
                            : <><Video className="h-5 w-5" /> Generate with {videoEngine === "json2video" ? "JSON2Video" : "Remotion"}</>}
                        </Button>
                      )}

                      {/* Results */}
                      {(json2videoUrl || remotionUrl) && (
                        <div className="space-y-3">
                          <Label className="text-sm font-medium text-slate-700">Generated Videos</Label>
                          <div className={`grid gap-3 ${json2videoUrl && remotionUrl ? "grid-cols-2" : "grid-cols-1"}`}>
                            {json2videoUrl && (
                              <div className={`neu-card-sm p-3 ${
                                videoUrl === json2videoUrl ? "neu-inset-sm" : "opacity-70"}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium flex items-center gap-1">
                                    JSON2Video
                                    {json2videoRenderTime > 0 && (
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                        <Clock className="h-2.5 w-2.5" /> {json2videoRenderTime.toFixed(1)}s
                                      </span>
                                    )}
                                  </span>
                                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setVideoUrl(json2videoUrl)}>
                                    {videoUrl === json2videoUrl ? <CheckCircle2 className="h-3 w-3 text-primary" /> : "Use this"}
                                  </Button>
                                </div>
                                <video src={json2videoUrl} controls className="w-full rounded max-h-48" />
                              </div>
                            )}
                            {remotionUrl && (
                              <div className={`neu-card-sm p-3 ${
                                videoUrl === remotionUrl ? "neu-inset-sm" : "opacity-70"}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium flex items-center gap-1">
                                    Remotion
                                    {remotionRenderTime > 0 && (
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                        <Clock className="h-2.5 w-2.5" /> {remotionRenderTime.toFixed(1)}s
                                      </span>
                                    )}
                                  </span>
                                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setVideoUrl(remotionUrl)}>
                                    {videoUrl === remotionUrl ? <CheckCircle2 className="h-3 w-3 text-primary" /> : "Use this"}
                                  </Button>
                                </div>
                                <video src={remotionUrl} controls className="w-full rounded max-h-48" />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Try other engine / Regen */}
                      {(json2videoUrl || remotionUrl) && (
                        <div className="flex gap-2">
                          {!json2videoUrl && (
                            <Button onClick={() => { setVideoEngine("json2video"); handleGenerateVideo(); }} disabled={generatingVideo} variant="outline" className="flex-1 gap-2 neu-button">
                              {generatingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              Try JSON2Video
                            </Button>
                          )}
                          {!remotionUrl && (
                            <Button onClick={() => { setVideoEngine("remotion"); handleGenerateVideo(); }} disabled={generatingVideo} variant="outline" className="flex-1 gap-2 neu-button">
                              {generatingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              Try Remotion
                            </Button>
                          )}
                          {json2videoUrl && (
                            <Button onClick={() => { setVideoEngine("json2video"); handleGenerateVideo(); }} disabled={generatingVideo} variant="outline" size="sm" className="gap-1 neu-button">
                              {generatingVideo ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                              Regen JSON2Video
                            </Button>
                          )}
                          {remotionUrl && (
                            <Button onClick={() => { setVideoEngine("remotion"); handleGenerateVideo(); }} disabled={generatingVideo} variant="outline" size="sm" className="gap-1 neu-button">
                              {generatingVideo ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                              Regen Remotion
                            </Button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              <Separator className="bg-slate-200/60" />

              <Button onClick={() => { setStep(4); setMaxStep(4); }} size="lg" className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/25">
                <Send className="h-4 w-4" /> Continue to Publish
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== STEP 4: PUBLISH ===== */}
        <TabsContent value="step-4" className="space-y-5 mt-6">
          <Card className="neu-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base font-semibold text-slate-800 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 text-[11px] font-semibold px-1.5">4</span>
                Publish or Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="neu-card p-5 space-y-3">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Preview</p>
                {headline && (
                  <p className="text-sm font-semibold text-slate-700 leading-tight">{headline}</p>
                )}
                <p className="text-sm text-slate-600 leading-relaxed">{generatedText?.slice(0, 200)}...</p>

                {parseHashtags(hashtags).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {parseHashtags(hashtags).map((t) => (
                      <span key={t} className="text-xs text-blue-600 font-medium">#{t}</span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {(platforms.includes("all") ? ALL_PLATFORMS : ALL_PLATFORMS.filter(p => platforms.includes(p.id))).map((p) => (
                    <Badge key={p.id} variant="outline" className={`text-[10px] ${p.color}`}>{p.label}</Badge>
                  ))}
                </div>

                {mediaType === "image" && (imageUrl || uploadedImageUrl) && (
                  <img src={imageSource === "upload" ? uploadedImageUrl : imageUrl} alt="Post media" className="mt-2 h-24 neu-card-sm max-h-72 object-cover border-slate-200 shadow-xs" />
                )}
                {mediaType === "video" && (videoUrl || uploadedVideoUrl) && (
                  <video src={videoSource === "upload" ? uploadedVideoUrl : videoUrl} controls className="mt-2 h-24 rounded-lg border border-slate-200 shadow-xs" />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Schedule for later (optional)</Label>
                <Input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="h-10 neu-inset" />
                {scheduleDate && (
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    Posts on {new Date(scheduleDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} at {new Date(scheduleDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                {scheduleDate ? (
                  <Button onClick={() => handlePublish(false)} size="lg" className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/25">
                    <CalendarIcon className="h-4 w-4" /> Schedule
                  </Button>
                ) : (
                  <Button onClick={() => handlePublish(true)} size="lg" className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/25" disabled={postproxyRemaining <= 0}>
                    <Send className="h-4 w-4" /> Publish Now
                  </Button>
                )}
                <Button onClick={handleSaveDraft} variant="outline" size="lg" className="flex-1 gap-2 neu-button text-slate-700 shadow-xs">
                  Save Draft
                </Button>
              </div>

              <div className="neu-inset-sm p-4">
                <div className="flex items-start gap-2.5 text-xs">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-amber-800 leading-relaxed">
                    {postproxyRemaining > 0
                      ? <><strong className="font-semibold">{postproxyRemaining}</strong> of {postproxyLimit} posts remaining this month. Resets {new Date(resetDate).toLocaleDateString()}.{scheduleDate && (() => {
                          const schedMonth = new Date(scheduleDate).getMonth();
                          const schedYear = new Date(scheduleDate).getFullYear();
                          const nowDate = new Date();
                          const monthDiff = (schedYear - nowDate.getFullYear()) * 12 + (schedMonth - nowDate.getMonth());
                          if (monthDiff === 0 && postproxyRemaining <= 0) return ` Cannot schedule this month. Pick ${months[1]?.label || "next month"} or later.`;
                          if (monthDiff > 0) return ` This uses ${months[monthDiff]?.label || "a future month"}'s quota.`;
                          return "";
                        })()}</>
                      : <>Postproxy limit reached ({postproxyUsed}/{postproxyLimit}). {months[1] ? <>You can schedule for <strong className="font-semibold">{months[1].label}</strong> onwards (resets {new Date(resetDate).toLocaleDateString()}).</> : <>Resets {new Date(resetDate).toLocaleDateString()}.</>}</>}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
