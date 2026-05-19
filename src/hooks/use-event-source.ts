import { useEffect, useEffectEvent } from "react";

export function useEventSource({
  topics,
  callback,
}: {
  topics: string[];
  callback: (data: any) => void;
}) {
  const topicsKey = [...topics].sort().join("\0");

  const onUpdate = useEffectEvent((data: unknown) => {
    callback(data);
  });

  useEffect(() => {
    const sortedTopics = topicsKey ? topicsKey.split("\0") : [];
    const appId = "676bb0d1-942d-465a-a706-4ee451177507";
    let topicsString = "?";
    sortedTopics.forEach((topic) => {
      if (topicsString !== "?") topicsString += "&";
      topicsString += `topic[]=${topic}`;
    });
    const sse = new EventSource(
      `https://sync-connect.pno.dev/stream/${appId}${topicsString}`,
    );
    sse.addEventListener("update", (data) => {
      onUpdate(data);
    });

    return () => {
      sse.close();
    };
  }, [topicsKey]);
}
