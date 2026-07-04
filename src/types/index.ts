export type Platform = "twitter" | "linkedin" | "facebook" | "instagram" | "pinterest" | "threads";

export type ContentStatus = "draft" | "scheduled" | "publishing" | "published" | "failed";

export type ContentType = "post" | "thread" | "carousel";

export interface ContentItem {
  id: string;
  userId: string;
  platform: Platform | "all";
  contentType: ContentType;
  status: ContentStatus;
  topic: string;
  body: string;
  imageUrl: string | null;
  videoUrl: string | null;
  hashtags: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  postproxyPostId: string | null;
  aiModel: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  tone: "formal" | "casual" | "professional" | "playful";
  imageStyle: "photographic" | "illustrated" | "minimalist" | "abstract";
  ctaStyle: "soft" | "medium" | "strong";
}

export interface PostproxyPostRequest {
  profile_group_id: string;
  profiles: string[];
  content: {
    body: string;
    media_urls?: string[];
  };
}
