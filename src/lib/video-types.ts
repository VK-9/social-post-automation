export type VideoEngine = "json2video" | "remotion";

export type BgSource = "auto" | "color" | "upload" | "ai";

export interface VideoRequest {
  text: string;
  hashtags?: string;
  bgSource: BgSource;
  bgColor?: string;
  bgImageUrl?: string;
  engine: VideoEngine;
  style: string;
  voiceover?: boolean;
}

export type Json2VideoStyle =
  | "minimal"
  | "bold-quote"
  | "cinematic"
  | "story"
  | "gradient";

export type RemotionTemplate =
  | "minimal"
  | "quote-card"
  | "story-mode"
  | "slideshow";

export interface VideoResult {
  videoUrl: string;
  engine: VideoEngine;
  renderTime: number;
}

export const JSON2VIDEO_STYLES = [
  { id: "minimal", label: "Minimal", desc: "Clean centered text on gradient" },
  { id: "bold-quote", label: "Bold Quote", desc: "Large dramatic quote text" },
  { id: "cinematic", label: "Cinematic", desc: "Dark overlay, film-style text" },
  { id: "story", label: "Story", desc: "Bottom-aligned, Instagram Story style" },
  { id: "gradient", label: "Gradient", desc: "Animated gradient background" },
] as const;

export const REMOTION_TEMPLATES = [
  { id: "minimal", label: "Minimal", desc: "Clean centered text, fade-in" },
  { id: "quote-card", label: "Quote Card", desc: "Large quote with attribution" },
  { id: "story-mode", label: "Story Mode", desc: "Full-bleed story layout" },
  { id: "slideshow", label: "Slideshow", desc: "Multi-slide text sequence" },
] as const;

export const BG_SOURCES = [
  { id: "auto" as const, label: "Auto (from topic)", desc: "AI generates matching background" },
  { id: "color" as const, label: "Solid Color", desc: "Pick a background color" },
  { id: "upload" as const, label: "Upload Image", desc: "Use your own image" },
  { id: "ai" as const, label: "AI Image", desc: "Generate with AI prompt" },
] as const;
