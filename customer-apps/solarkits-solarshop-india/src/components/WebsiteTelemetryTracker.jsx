import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  trackPageView,
  trackEngagementHeartbeat,
  HEARTBEAT_INTERVAL_MS,
} from "../utils/websiteTelemetry";

export default function WebsiteTelemetryTracker() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(`${location.pathname}${location.search || ""}`);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        trackEngagementHeartbeat(false);
      }
    }, HEARTBEAT_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        trackEngagementHeartbeat(true);
      }
    };

    const handlePageHide = () => {
      trackEngagementHeartbeat(true);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  return null;
}
