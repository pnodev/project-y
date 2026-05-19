import { env } from "~/env";

export async function sync(topic: string, payload: unknown) {
  const baseUrl = env.SYNC_ENGINE_URL ?? "https://sync-connect.pno.dev";
  await fetch(
    `${baseUrl}/stream/${env.SYNC_APP_ID}?key=${env.SYNC_PUBLISH_KEY}&topic=${topic}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload }),
    },
  );
}
