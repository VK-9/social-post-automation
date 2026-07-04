"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [debug, setDebug] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setDebug("Attempting sign in...");

    try {
      const form = new FormData(e.currentTarget);
      const email = form.get("email") as string;
      const password = form.get("password") as string;

      setDebug(`Signing in as ${email}...`);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setDebug(error ? `Error: ${error.message}` : "Success! Redirecting...");
      setLoading(false);

      if (error) {
        toast.error(error.message);
      } else {
        router.push("/home");
      }
    } catch (err) {
      setDebug(`Exception: ${err}`);
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <div className="w-full space-y-6">
        <div className="text-center mb-2">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl neu-inset-sm">
            <Sparkles className="h-5 w-5 text-emerald-600" />
          </div>
          <CardTitle className="text-xl font-semibold tracking-tight text-slate-800">Social Post Automation</CardTitle>
          <CardDescription className="text-slate-500 mt-1">Sign in to manage your social media posts</CardDescription>
        </div>

        <Card className="neu-card">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">Email</Label>
                <Input id="email" name="email" type="email" placeholder="you@example.com" required className="neu-inset h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">Password</Label>
                <Input id="password" name="password" type="password" required className="neu-inset h-11" />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-emerald-600 font-medium hover:text-emerald-700 underline">
                Register
              </Link>
            </p>
            {debug && <p className="mt-2 text-center text-xs text-slate-400">{debug}</p>}
          </CardContent>
        </Card>
      </div>
  );
}
