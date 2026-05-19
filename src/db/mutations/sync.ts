import { env } from "~/env";

const DEFAULT_SYNC_ENGINE_URL = "https://sync-connect.pno.dev";

function resolveSyncEngineUrl(): string {
  const configured = env.SYNC_ENGINE_URL;
  if (!configured) return DEFAULT_SYNC_ENGINE_URL;

  try {
    const { hostname } = new URL(configured);
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return DEFAULT_SYNC_ENGINE_URL;
    }
  } catch {
    return DEFAULT_SYNC_ENGINE_URL;
  }

  return configured;
}

export async function sync(topic: string, payload: unknown) {
  const baseUrl = resolveSyncEngineUrl();
  try {
    const response = await fetch(
      `${baseUrl}/stream/${env.SYNC_APP_ID}?key=${env.SYNC_PUBLISH_KEY}&topic=${topic}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      console.error(
        `Sync failed for topic "${topic}" (app ${env.SYNC_APP_ID}, ${baseUrl}): ${response.status} ${body}`,
      );
    }
  } catch (error) {
    console.error(
      `Sync error for topic "${topic}" (app ${env.SYNC_APP_ID}, ${baseUrl}):`,
      error,
    );
  }
}
