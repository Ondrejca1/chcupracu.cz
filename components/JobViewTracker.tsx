"use client";

import { useEffect } from "react";

export function JobViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const url = `/jobs/${slug}/view`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([], { type: "text/plain" }));
      return;
    }
    void fetch(url, { method: "POST", keepalive: true });
  }, [slug]);

  return null;
}
