"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  PlusCircle,
  ListOrdered,
  Calendar,
  Settings,
  LogOut,
  Sparkles,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/home", label: "Dashboard", icon: LayoutDashboard },
  { href: "/create", label: "Create Post", icon: PlusCircle },
  { href: "/queue", label: "Content Queue", icon: ListOrdered },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className="neu-sidebar fixed sm:static z-40 bottom-0 left-0 right-0 sm:flex sm:w-64 sm:flex-col sm:h-screen shrink-0 flex-row h-16 sm:h-screen w-full sm:items-stretch sm:justify-start justify-around px-0 sm:px-3 overflow-x-auto">
        <div className="hidden sm:flex items-center gap-3 px-3 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl neu-card-sm">
            <Sparkles className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <span className="text-sm font-semibold tracking-tight text-slate-800">Social Post AI</span>
            <p className="text-[10px] text-emerald-600/70 font-medium uppercase tracking-widest">Automation</p>
          </div>
        </div>
        <Separator className="hidden sm:block bg-slate-200/50" />
        <nav className="flex h-full sm:flex-col sm:flex-1 sm:gap-2 sm:px-0 sm:py-2 items-stretch sm:items-stretch flex-1">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 sm:flex-none flex-col items-center justify-center sm:flex-row sm:w-full sm:justify-start sm:items-center gap-1 sm:gap-3 rounded-none sm:rounded-lg px-0 sm:px-4 h-full sm:h-auto sm:py-2.5 text-xs sm:text-sm sm:font-medium sm:leading-tight transition-all whitespace-nowrap ${
                  active
                    ? "sm:neu-inset text-emerald-600 sm:text-emerald-600 sm:font-bold border-t-2 sm:border-t-0 sm:border-l-[3px] border-emerald-500"
                    : "text-slate-400 sm:text-slate-500 hover:text-emerald-600 sm:hover:text-slate-700 sm:hover:neu-inset-sm border-t-2 sm:border-t-0 sm:border-l-[3px] border-transparent"
                }`}
              >
                <Icon className={`h-6 w-6 sm:h-4 sm:w-4 shrink-0 ${active ? "text-emerald-600" : ""}`} />
                <span className="hidden sm:inline">{item.label}</span>
                <span className={`sm:hidden text-[11px] leading-tight ${active ? "text-emerald-600 font-bold" : "text-slate-400"}`}>{item.label}</span>
                {active && <ChevronRight className="h-4 w-4 ml-auto text-emerald-500 hidden sm:block" />}
              </Link>
            );
          })}
        </nav>
        <Separator className="hidden sm:block bg-slate-200/50" />
        <div className="hidden sm:block p-2">
          <button
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 neu-inset-sm hover:text-slate-700 transition-all"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto pb-16 sm:pb-8 p-4 sm:p-8">{children}</main>
    </div>
  );
}
