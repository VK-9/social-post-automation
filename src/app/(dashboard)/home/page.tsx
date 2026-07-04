"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, ListOrdered, CalendarDays, CheckCircle2, XCircle, Clock, TrendingUp, Sparkles } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [ppUsed, setPpUsed] = useState(0);
  const [ppLimit, setPpLimit] = useState(10);

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

  useEffect(() => {
    fetch("/api/postproxy-usage")
      .then((r) => r.json())
      .then((d) => { setPpUsed(d.used); setPpLimit(d.limit); });
  }, []);

  const stats = {
    total: posts.length,
    draft: posts.filter((i: any) => i.status === "draft").length,
    scheduled: posts.filter((i: any) => i.status === "scheduled").length,
    published: posts.filter((i: any) => i.status === "published").length,
    failed: posts.filter((i: any) => i.status === "failed").length,
  };

  const statCards = [
    { label: "Total Posts", value: stats.total, icon: ListOrdered, color: "text-emerald-600", bg: "bg-emerald-100/80" },
    { label: "Drafts", value: stats.draft, icon: Clock, color: "text-amber-600", bg: "bg-amber-100/80" },
    { label: "Scheduled", value: stats.scheduled, icon: CalendarDays, color: "text-violet-600", bg: "bg-violet-100/80" },
    { label: "Published", value: stats.published, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100/80" },
    { label: "Failed", value: stats.failed, icon: XCircle, color: "text-red-600", bg: "bg-red-100/80" },
  ];

  const ppPercent = ppLimit > 0 ? Math.round((ppUsed / ppLimit) * 100) : 0;

  function getPlatformBadge(platform: string) {
    const map: Record<string, { label: string; color: string }> = {
      twitter: { label: "X", color: "bg-slate-900 text-white" },
      linkedin: { label: "LI", color: "bg-blue-600 text-white" },
      facebook: { label: "FB", color: "bg-blue-500 text-white" },
      instagram: { label: "IG", color: "bg-pink-500 text-white" },
      pinterest: { label: "Pin", color: "bg-red-500 text-white" },
      threads: { label: "Thr", color: "bg-slate-900 text-white" },
    };
    return map[platform] || { label: platform, color: "bg-slate-500 text-white" };
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">Dashboard</h1>
          <p className="text-sm sm:text-base text-slate-400 mt-1">Overview of your social media content</p>
        </div>
        <Link href="/create">
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20">
            <PlusCircle className="h-4 w-4" /> New Post
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:gap-5 grid-cols-2 md:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="neu-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500">{card.label}</CardTitle>
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800 tabular-nums">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
        <Card className="neu-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-sm font-semibold text-slate-900">Postproxy Usage</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-3 w-full rounded-full bg-slate-200/60">
                  <div
                    className={`h-3 rounded-full transition-all ${ppPercent >= 80 ? "bg-red-500" : ppPercent >= 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(ppPercent, 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-base font-semibold text-slate-800 tabular-nums">{ppUsed}/{ppLimit}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">{ppLimit - ppUsed} posts remaining this month</p>
          </CardContent>
        </Card>

        <Card className="neu-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm font-semibold text-slate-900">Quick Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Link href="/create" className="flex-1">
              <Button variant="outline" className="w-full gap-2 neu-button text-slate-700">
                <PlusCircle className="h-4 w-4" /> Create Post
              </Button>
            </Link>
            <Link href="/queue" className="flex-1">
              <Button variant="outline" className="w-full gap-2 neu-button text-slate-700">
                <ListOrdered className="h-4 w-4" /> View Queue
              </Button>
            </Link>
            <Link href="/calendar" className="flex-1">
              <Button variant="outline" className="w-full gap-2 neu-button text-slate-700">
                <CalendarDays className="h-4 w-4" /> Calendar
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="neu-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-900">Recent Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
              <Sparkles className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">No posts yet. Create your first post!</p>
              <Link href="/create" className="mt-4">
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20">
                  <PlusCircle className="h-4 w-4" /> Create Your First Post
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {posts.slice(0, 5).map((post: any) => {
                const platforms = (post.platform || "").split(",").filter(Boolean);
                return (
                  <div key={post.id} className="neu-card-sm px-4 py-3 transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{post.body?.slice(0, 80)}...</p>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                        <div className="flex gap-1">
                          {platforms.map((id: string) => {
                            const p = getPlatformBadge(id);
                            return <Badge key={id} className={`text-[9px] px-1.5 py-0 ${p.color}`}>{p.label}</Badge>;
                          })}
                        </div>
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Badge variant={post.status === "published" ? "default" : post.status === "failed" ? "destructive" : "secondary"} className="ml-3 shrink-0 capitalize">
                      {post.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
