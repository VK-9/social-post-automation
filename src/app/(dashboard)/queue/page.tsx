"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Send, Calendar as CalendarIcon, Sparkles, ListOrdered } from "lucide-react";

const ALL_PLATFORMS: Record<string, { label: string; color: string }> = {
  twitter: { label: "X (Twitter)", color: "bg-slate-900 text-white" },
  linkedin: { label: "LinkedIn", color: "bg-blue-600 text-white" },
  facebook: { label: "Facebook", color: "bg-blue-500 text-white" },
  instagram: { label: "Instagram", color: "bg-pink-500 text-white" },
  pinterest: { label: "Pinterest", color: "bg-red-500 text-white" },
  threads: { label: "Threads", color: "bg-slate-900 text-white" },
};

export default function QueuePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/login");
      else setUserId(user.id);
    });
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/content?userId=${userId}`)
      .then((r) => r.json())
      .then(setPosts);
  }, [userId]);

  async function handlePublish(id: string) {
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Post published!");
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "published" } : p)));
    } catch {
      toast.error("Publish failed");
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/content/${id}`, { method: "DELETE" });
      toast.success("Post deleted");
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error("Delete failed");
    }
  }

  function getPlatforms(post: any): string[] {
    if (!post.platform) return [];
    return post.platform.split(",").filter(Boolean);
  }

  const hasPosts = posts.length > 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">Content Queue</h1>
        <p className="text-sm sm:text-base text-slate-400 mt-1">{posts.length} post{posts.length !== 1 ? "s" : ""} in queue</p>
      </div>

      {!hasPosts ? (
        <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
            <ListOrdered className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-base font-medium text-slate-700">No posts yet</p>
          <p className="text-sm text-slate-500 mt-1">Create your first post to get started</p>
        </div>
      ) : (
        <Card className="neu-card">
          <CardContent className="pt-6">
            <div className="space-y-2">
              {posts.map((post) => {
                const platforms = getPlatforms(post);
                return (
                  <div key={post.id} className="flex items-center justify-between neu-card-sm px-4 py-3 transition-all">
                    <div className="flex-1 min-w-0">
                      {post.headline && (
                        <p className="text-sm font-semibold text-slate-800 truncate">{post.headline}</p>
                      )}
                      <p className="truncate text-sm text-slate-600">{post.body?.slice(0, 120) || post.topic}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5 items-center text-xs text-slate-500">
                        <div className="flex flex-wrap gap-1">
                          {platforms.map((id: string) => {
                            const p = ALL_PLATFORMS[id];
                            return p ? <Badge key={id} variant="outline" className={`text-[9px] px-1.5 py-0 ${p.color}`}>{p.label}</Badge> : null;
                          })}
                        </div>
                        <span className="text-[10px]">{new Date(post.created_at).toLocaleDateString()}</span>
                        {post.scheduled_at && (
                          <span className="text-[10px] flex items-center gap-0.5">
                            <CalendarIcon className="h-2.5 w-2.5" />
                            {new Date(post.scheduled_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <Badge variant={post.status === "published" ? "default" : post.status === "failed" ? "destructive" : "secondary"} className="capitalize">
                        {post.status}
                      </Badge>
                      {(post.status === "draft" || post.status === "failed") && (
                        <Button size="sm" variant="outline" onClick={() => handlePublish(post.id)} className="neu-button hover:bg-transparent">
                          <Send className="h-3 w-3" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(post.id)} className="hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
