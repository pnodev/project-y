import { useEffect } from "react";

export function useEventSource({
  topics,
  callback,
}: {
  topics: string[];
  callback: (data: any) => void;
}) {
  useEffect(() => {
    const appId = "676bb0d1-942d-465a-a706-4ee451177507";
    let topicsString = "?";
    topics.forEach((topic) => {
      if (topicsString !== "?") topicsString += "&";
      topicsString += `topic[]=${topic}`;
    });
    const sse = new EventSource(
      `https://sync-connect.pno.dev/stream/${appId}${topicsString}`
    );
    sse.addEventListener("update", (data) => {
      callback(data);
    });

    return () => {
      sse.close();
    };
  }, [topics]);
}
