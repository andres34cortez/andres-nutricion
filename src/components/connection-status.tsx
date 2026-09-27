"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

type Connection = "checking" | "online" | "offline";

export function ConnectionStatus() {
  const [status, setStatus] = useState<Connection>("checking");

  const checkConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setStatus("offline");
      return;
    }
    try {
      const response = await fetch("/api/health", { cache: "no-store", signal: AbortSignal.timeout(5000) });
      setStatus(response.ok && navigator.onLine ? "online" : "offline");
    } catch {
      setStatus("offline");
    }
  }, []);

  useEffect(() => {
    const initialCheck = window.setTimeout(checkConnection, 0);
    window.addEventListener("online", checkConnection);
    window.addEventListener("offline", checkConnection);
    const interval = window.setInterval(checkConnection, 30_000);
    return () => {
      window.clearTimeout(initialCheck);
      window.removeEventListener("online", checkConnection);
      window.removeEventListener("offline", checkConnection);
      window.clearInterval(interval);
    };
  }, [checkConnection]);

  if (status !== "offline") return null;

  return <Badge role="status" aria-live="polite" className="connection-status offline"><span aria-hidden="true" className="connection-led" />Sin conexión</Badge>;
}
