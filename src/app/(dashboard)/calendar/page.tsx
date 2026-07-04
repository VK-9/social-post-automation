"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, Sparkles } from "lucide-react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ALL_PLATFORMS: Record<string, { label: string; color: string }> = {
  twitter: { label: "X", color: "bg-slate-900 text-white" },
  linkedin: { label: "LI", color: "bg-blue-600 text-white" },
  facebook: { label: "FB", color: "bg-blue-500 text-white" },
  instagram: { label: "IG", color: "bg-pink-500 text-white" },
  pinterest: { label: "Pin", color: "bg-red-500 text-white" },
  threads: { label: "Thr", color: "bg-slate-900 text-white" },
};

export default function CalendarPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/login");
      else setUserId(user.id);
    });
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/schedule?userId=${userId}`)
      .then((r) => r.json())
      .then(setPosts);
  }, [userId]);

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const getPostsForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return posts.filter((p) => p.scheduled_at?.startsWith(dateStr));
  };

  const today = new Date();
  const calendarDays: React.ReactNode[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="min-h-[100px] rounded-xl neu-inset-sm opacity-40" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayPosts = getPostsForDay(day);
    const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
    calendarDays.push(
      <div
        key={day}
        className={`min-h-[100px] rounded-xl p-2 cursor-pointer transition-all ${
          isToday ? "neu-inset-sm ring-2 ring-emerald-400/50" : "neu-card-sm hover:neu-inset-sm"
        }`}
        onClick={() => {
          if (dayPosts.length > 0) {
            setSelectedPost(dayPosts[0]);
            setSheetOpen(true);
          }
        }}
      >
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${isToday ? "text-emerald-700" : "text-slate-700"}`}>{day}</span>
          {isToday && <span className="text-[9px] text-white font-medium px-1.5 py-0.5 rounded-full bg-emerald-500">Today</span>}
        </div>
        <div className="mt-1.5 space-y-1">
          {dayPosts.slice(0, 3).map((post) => {
            const platforms = (post.platform || "").split(",").filter(Boolean);
            return (
              <div key={post.id} className="rounded-lg neu-card-sm px-1.5 py-1">
                <p className="text-[10px] text-slate-700 truncate leading-tight font-medium">
                  {post.body?.slice(0, 25) || post.topic}
                </p>
                <div className="flex gap-0.5 mt-0.5 flex-wrap">
                  {platforms.slice(0, 3).map((id: string) => {
                    const p = ALL_PLATFORMS[id];
                    return p ? <Badge key={id} variant="outline" className={`text-[7px] px-1 py-0 ${p.color}`}>{p.label}</Badge> : null;
                  })}
                </div>
              </div>
            );
          })}
          {dayPosts.length > 3 && (
            <p className="text-[9px] text-slate-500 font-medium text-center">+{dayPosts.length - 3} more</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">Calendar</h1>
          <p className="text-sm sm:text-base text-slate-400 mt-1">{posts.length} scheduled {posts.length === 1 ? "post" : "posts"}</p>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); } else setCurrentMonth((m) => m - 1); }} className="neu-button">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); } else setCurrentMonth((m) => m + 1); }} className="neu-button">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="neu-card">
        <div className="bg-gradient-to-r from-emerald-600/90 to-emerald-500/90 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-white/90" />
            <h2 className="text-lg font-semibold text-white">{MONTHS[currentMonth]} {currentYear}</h2>
          </div>
        </div>
        <CardContent className="p-3 sm:p-4 overflow-x-auto">
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 min-w-[560px] sm:min-w-0">
            {DAYS.map((d) => (
              <div key={d} className="p-1.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">{d}</div>
            ))}
            {calendarDays}
          </div>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-white border-l border-slate-200">
          {selectedPost && (
            <>
              <SheetHeader className="pb-4 border-b border-slate-200/60">
                <SheetTitle className="text-lg text-slate-900">Post Details</SheetTitle>
                <SheetDescription className="flex items-center gap-1.5 text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {new Date(selectedPost.scheduled_at).toLocaleString("en-US", {
                    weekday: "long", month: "long", day: "numeric", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-5 p-4 overflow-y-auto">
                {selectedPost.headline && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">Headline</p>
                    <p className="text-sm font-semibold text-slate-800">{selectedPost.headline}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">Content</p>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedPost.body}</p>
                </div>
                {selectedPost.hashtags && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">Hashtags</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedPost.hashtags.split(/[\s,]+/).filter(Boolean).map((t: string) => (
                        <span key={t} className="text-xs text-blue-600 font-medium">#{t.replace(/^#+/, "")}</span>
                      ))}
                    </div>
                  </div>
                )}
                {(selectedPost.platform) && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">Platforms</p>
                    <div className="flex flex-wrap gap-1">
                      {(selectedPost.platform || "").split(",").filter(Boolean).map((id: string) => {
                        const p = ALL_PLATFORMS[id];
                        return p ? <Badge key={id} variant="outline" className={p.color}>{p.label}</Badge> : null;
                      })}
                    </div>
                  </div>
                )}
                {selectedPost.image_url && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">Image</p>
                    <img src={selectedPost.image_url} alt="Post image" className="w-full max-h-48 rounded-xl object-cover border border-slate-200/60 shadow-sm" />
                  </div>
                )}
                {selectedPost.video_url && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">Video</p>
                    <video src={selectedPost.video_url} controls className="w-full rounded-xl border border-slate-200/60 shadow-sm" />
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-500 pt-4 border-t border-slate-200/60">
                  <Badge variant={selectedPost.status === "published" ? "default" : selectedPost.status === "scheduled" ? "secondary" : "outline"} className="capitalize">
                    {selectedPost.status}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Created {new Date(selectedPost.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
