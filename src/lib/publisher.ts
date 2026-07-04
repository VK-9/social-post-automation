const POSTPROXY_API_KEY = process.env.POSTPROXY_API_KEY;
const POSTPROXY_BASE = "https://api.postproxy.dev/v1";

interface PublishParams {
  profileGroupId: string;
  profileIds: string[];
  body: string;
  mediaUrls?: string[];
}

export async function publishToSocial(params: PublishParams): Promise<{ postId: string }> {
  const res = await fetch(`${POSTPROXY_BASE}/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${POSTPROXY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      profile_group_id: params.profileGroupId,
      profiles: params.profileIds,
      content: {
        body: params.body,
        media_urls: params.mediaUrls,
      },
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
