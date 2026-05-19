import { env } from "~/env";

export async function sync(topic: string, payload: unknown) {
  const baseUrl = env.SYNC_ENGINE_URL ?? "https://sync-connect.pno.dev";
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
