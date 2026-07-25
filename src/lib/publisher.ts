const POSTPROXY_API_KEY = process.env.POSTPROXY_API_KEY;
const POSTPROXY_BASE = "https://api.postproxy.dev/api";

interface PublishParams {
  profileIds: string[];
  body: string;
  mediaUrls?: string[];
}

async function autoResolvePlatforms(): Promise<Record<string, Record<string, string>>> {
  const platforms: Record<string, Record<string, string>> = {};

  const profilesRes = await fetch(`${POSTPROXY_BASE}/profiles`, {
    headers: { Authorization: `Bearer ${POSTPROXY_API_KEY}` },
  });
  if (!profilesRes.ok) return platforms;

  const profilesData = await profilesRes.json();
  const profilesList: any[] = Array.isArray(profilesData) ? profilesData : profilesData.profiles || profilesData.data || [];

  for (const profile of profilesList) {
    const plat = profile.platform?.toLowerCase();
    if (plat !== "facebook" && plat !== "linkedin") continue;

    const plcRes = await fetch(`${POSTPROXY_BASE}/profiles/${profile.id}/placements`, {
      headers: { Authorization: `Bearer ${POSTPROXY_API_KEY}` },
    });
    if (!plcRes.ok) continue;

    const plcData = await plcRes.json();
    const placements: any[] = Array.isArray(plcData) ? plcData : plcData.placements || plcData.data || [];

    if (plat === "facebook" && placements[0]) {
      platforms.facebook = { page_id: placements[0].id };
    } else if (plat === "linkedin" && placements[0]) {
      platforms.linkedin = { organization_id: placements[0].id };
    }
  }

  return platforms;
}

export async function publishToSocial(params: PublishParams): Promise<{ postId: string }> {
  const platforms = await autoResolvePlatforms();

  const res = await fetch(`${POSTPROXY_BASE}/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${POSTPROXY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      post: {
        body: params.body,
      },
      profiles: params.profileIds,
      ...(Object.keys(platforms).length ? { platforms } : {}),
      ...(params.mediaUrls?.length ? { media: params.mediaUrls } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Postproxy error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return { postId: data.id };
}

export async function getPublishStatus(postId: string): Promise<string> {
  const res = await fetch(`${POSTPROXY_BASE}/posts/${postId}`, {
    headers: { Authorization: `Bearer ${POSTPROXY_API_KEY}` },
  });

  if (!res.ok) throw new Error(`Postproxy status error: ${res.status}`);
  const data = await res.json();
  return data.status;
}
