import { useEffect, useRef } from "react";

const SseListener = () => {
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (eventSourceRef.current) return;
    console.log("📡 Starting SSE connection...");
    const es = new EventSource(
      `${import.meta.env.VITE_API_URL}/events`
    );

    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("🔔 Notification:", data);
    };

    es.onerror = (err) => {
      console.log("❌ SSE error", err);
      es.close();
      eventSourceRef.current = null;
    };

    return () => {
      console.log("🛑 Closing SSE connection");
      es.close();
      eventSourceRef.current = null;
    };
  }, []);

  return null;
};

export default SseListener;
