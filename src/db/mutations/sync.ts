import fetch from "node-fetch";

export async function sync(topic: string, payload: any) {
  const appId = "676bb0d1-942d-465a-a706-4ee451177507";
  const key = "OIV3S2Q-ZMPEFQI-RHMNAVY-F4UZDDA";
  await fetch(
    `https://connect.sync.pno.dev/stream/${appId}?key=${key}&topic=${topic}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload }),
    }
  );
}
