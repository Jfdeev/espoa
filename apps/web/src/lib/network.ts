import { useEffect, useState } from "react";

export function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { response?: unknown; code?: string; message?: string };
  if (err.response) return false;
  if (err.code === "ERR_NETWORK" || err.code === "ECONNABORTED") return true;
  return typeof err.message === "string" && /network|offline|timeout/i.test(err.message);
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(isOnline);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}
