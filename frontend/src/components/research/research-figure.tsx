"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { API_BASE_URL } from "@/lib/config";

/**
 * Loads a training figure that sits behind the researcher-only API.
 *
 * A plain <img src> cannot send an Authorization header, so the PNG is fetched
 * as a blob with the bearer token and shown from an object URL.
 */
export function ResearchFigure({
  model,
  fig,
  alt,
}: {
  model: string;
  fig: string;
  alt: string;
}) {
  const { data } = useSession();
  const token = data?.accessToken;
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!token) return;
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/research/figure.php?model=${model}&fig=${fig}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(String(response.status));
        const blob = await response.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [model, fig, token]);

  if (failed) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-border text-sm text-foreground/60">
        Figure unavailable
      </div>
    );
  }

  if (!url) {
    return <div className="h-56 animate-pulse rounded-xl border border-border bg-muted" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className="w-full rounded-xl border border-border bg-white object-contain p-2 dark:bg-slate-900"
    />
  );
}
