"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Polls `url` every `intervalMs` and returns { data, error, loading }.
 *
 * Why polling instead of Server-Sent Events / WebSockets: this dashboard
 * has exactly one viewer (you) and one writer (your own laptop's
 * heartbeat), updating at most once a minute. SSE/WebSockets would add a
 * persistent-connection server, reconnect/backoff handling, and Vercel
 * serverless-function lifetime constraints for a benefit that isn't
 * noticeable at a 30-60s cadence. Plain `fetch` on an interval is simpler,
 * cache-friendly, and works identically on any host. If this ever grows
 * into a multi-user or sub-second-latency product, SSE would be the first
 * upgrade to reach for.
 */
export function usePolling(url, intervalMs = 30000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function fetchOnce() {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const json = await res.json();
        if (mountedRef.current) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (mountedRef.current) setError(err);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    fetchOnce();
    timerRef.current = setInterval(fetchOnce, intervalMs);

    return () => {
      mountedRef.current = false;
      clearInterval(timerRef.current);
    };
  }, [url, intervalMs]);

  return { data, error, loading };
}
