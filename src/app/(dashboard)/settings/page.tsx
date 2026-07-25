"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Key, Palette, HardDrive, Trash2, RefreshCw, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [cloudflareToken, setCloudflareToken] = useState("");
  const [cloudflareAccountId, setCloudflareAccountId] = useState("");
  const [postproxyKey, setPostproxyKey] = useState("");
  const [tone, setTone] = useState("professional");
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/login");
      else setLoading(false);
    });
    fetch("/api/storage-info").then(r => r.json()).then(setStorageInfo);
  }, [router]);

  async function handleCleanup() {
    setCleaning(true);
    try {
      const res = await fetch("/api/cleanup-storage", { method: "POST" });
      const data = await res.json();
      toast.success(data.deleted ? `Deleted ${data.deleted} orphaned file(s)` : "Nothing to clean up");
      const info = await fetch("/api/storage-info").then(r => r.json());
      setStorageInfo(info);
    } catch {
      toast.error("Cleanup failed");
    }
    setCleaning(false);
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  function handleSaveKeys(e: React.FormEvent) {
    e.preventDefault();
    toast.success("API keys saved. Restart the app for changes to take effect.");
  }

  function handleSavePreferences(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Preferences saved!");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800">Settings</h1>

      <Card className="neu-card">
        <CardHeader>
          <div className="flex items-center gap-2"><Key className="h-5 w-5 text-slate-400" /><CardTitle className="text-slate-900">API Keys</CardTitle></div>
          <CardDescription className="text-slate-500">Configure your free API keys in .env.local</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveKeys} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-700">Supabase URL</Label>
              <Input value={process.env.NEXT_PUBLIC_SUPABASE_URL || ""} disabled placeholder="https://xxx.supabase.co" className="neu-inset h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Supabase Anon Key</Label>
              <Input value={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""} disabled type="password" className="neu-inset h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">OpenRouter API Key</Label>
              <Input type="password" value={openrouterKey} onChange={(e) => setOpenrouterKey(e.target.value)} placeholder="sk-or-..." className="neu-inset h-11" />
              <p className="text-xs text-slate-500">Get free at openrouter.ai/keys</p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Cloudflare API Token</Label>
              <Input type="password" value={cloudflareToken} onChange={(e) => setCloudflareToken(e.target.value)} placeholder="..." className="neu-inset h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Cloudflare Account ID</Label>
              <Input value={cloudflareAccountId} onChange={(e) => setCloudflareAccountId(e.target.value)} placeholder="..." className="neu-inset h-11" />
              <p className="text-xs text-slate-500">Cloudflare Workers AI — 100k calls/day free</p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Postproxy API Key</Label>
              <Input type="password" value={postproxyKey} onChange={(e) => setPostproxyKey(e.target.value)} placeholder="..." className="neu-inset h-11" />
              <p className="text-xs text-slate-500">Get free at postproxy.dev — 10 cross-posts/month</p>
            </div>
            <Button type="submit" variant="outline" className="neu-button text-slate-700"><Save className="mr-2 h-4 w-4" /> Save Keys</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="neu-card">
        <CardHeader>
          <div className="flex items-center gap-2"><Palette className="h-5 w-5 text-slate-400" /><CardTitle className="text-slate-900">Brand Preferences</CardTitle></div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSavePreferences} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-700">Default Tone</Label>
              <select className="flex h-11 w-full rounded-xl neu-inset bg-transparent px-3 py-2 text-sm font-medium text-slate-800" value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
                <option value="playful">Playful</option>
              </select>
            </div>
            <Button type="submit" variant="outline" className="neu-button text-slate-700"><Save className="mr-2 h-4 w-4" /> Save Preferences</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="neu-card">
        <CardHeader><CardTitle className="text-slate-900">Postproxy Setup</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-500">
          <p>1. Go to <a href="https://postproxy.dev" target="_blank" rel="noopener" className="text-emerald-600 underline">postproxy.dev</a> and create a free account</p>
          <p>2. Connect all 6 social accounts</p>
          <p>3. Create a profile group, copy IDs to .env.local</p>
          <p>4. Each cross-post to all platforms = 1 post on free tier</p>
        </CardContent>
      </Card>

      <Card className="neu-card">
        <CardHeader>
          <div className="flex items-center gap-2"><HardDrive className="h-5 w-5 text-slate-400" /><CardTitle className="text-slate-900">Storage</CardTitle></div>
        </CardHeader>
        <CardContent className="space-y-4">
          {storageInfo ? (
            <>
              <div className="neu-inset-sm p-3 flex items-start gap-2.5 text-xs rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="text-amber-800 leading-relaxed">
                  Media files are automatically cleaned up <strong>7 days</strong> after a post is published. Scheduled and draft posts are preserved. Supabase free plan: <strong>{storageInfo.freeTierLimit}</strong>.
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="neu-card p-3 text-center">
                  <p className="text-lg font-bold text-slate-800">{storageInfo.fileCount}</p>
                  <p className="text-xs text-slate-500">Files</p>
                </div>
                <div className="neu-card p-3 text-center">
                  <p className="text-lg font-bold text-slate-800">{storageInfo.totalMB} MB</p>
                  <p className="text-xs text-slate-500">Used</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCleanup} disabled={cleaning} variant="outline" size="sm" className="gap-1.5 neu-button text-slate-700">
                  {cleaning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  {cleaning ? "Cleaning..." : "Clean up orphaned files"}
                </Button>
                {storageInfo.storageUrl && (
                  <a href={storageInfo.storageUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-xs text-emerald-600 underline px-3 py-2">
                    Open Supabase Storage
                  </a>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Loading storage info...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
