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

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signUp({
      email: form.get("email") as string,
      password: form.get("password") as string,
      options: { data: { name: form.get("name") as string } },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! Check your email for confirmation, or sign in.");
      router.push("/login");
    }
  }

  return (
    <div className="w-full space-y-6">
        <div className="text-center mb-2">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl neu-inset-sm">
            <Sparkles className="h-5 w-5 text-emerald-600" />
          </div>
          <CardTitle className="text-xl font-semibold tracking-tight text-slate-800">Create Account</CardTitle>
          <CardDescription className="text-slate-500 mt-1">Set up your social post automation account</CardDescription>
        </div>

        <Card className="neu-card">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700">Name</Label>
                <Input id="name" name="name" placeholder="Your name" className="neu-inset h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">Email</Label>
                <Input id="email" name="email" type="email" placeholder="you@example.com" required className="neu-inset h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">Password</Label>
                <Input id="password" name="password" type="password" required minLength={6} className="neu-inset h-11" />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="text-emerald-600 font-medium hover:text-emerald-700 underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
  );
}
