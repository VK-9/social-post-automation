import { NextResponse } from "next/server";

const POSTPROXY_API_KEY = process.env.POSTPROXY_API_KEY;
const POSTPROXY_BASE = "https://api.postproxy.dev/v1";

export async function GET() {
  try {
    const res = await fetch(`${POSTPROXY_BASE}/profiles`, {
      headers: { Authorization: `Bearer ${POSTPROXY_API_KEY}` },
    });

    if (!res.ok) {
      return NextResponse.json({ platforms: ["twitter", "facebook", "linkedin", "instagram", "threads"] });
    }

    const data = await res.json();
    const profiles = Array.isArray(data) ? data : data.profiles || data.data || [];
    const platforms = profiles.map((p: any) => p.platform?.toLowerCase()).filter(Boolean);
    return NextResponse.json({ platforms });
  } catch {
    return NextResponse.json({ platforms: ["twitter", "facebook", "linkedin", "instagram", "threads"] });
  }
}
