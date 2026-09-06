"use client";

import { useCallback, useEffect, useState } from "react";

export function useLive<T>(url: string, eventId?: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to load");
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const streamUrl = eventId ? `/api/events/stream?eventId=${eventId}` : "/api/events/stream";
    const source = new EventSource(streamUrl);
    source.onmessage = () => {
      void refresh();
    };
    const poll = setInterval(() => void refresh(), 12000);
    return () => {
      source.close();
      clearInterval(poll);
    };
  }, [eventId, refresh]);

  return { data, error, loading, refresh };
}

export async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}
