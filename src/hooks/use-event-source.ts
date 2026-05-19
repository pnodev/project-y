import { useEffect, useRef } from "react";

export function useEventSource({
  topics,
  callback,
}: {
  topics: string[];
  callback: (data: any) => void;
}) {
  const topicsKey = [...topics].sort().join("\0");
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

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
      callbackRef.current(data);
    });

    return () => {
      sse.close();
    };
  }, [topicsKey, topics]);
}
