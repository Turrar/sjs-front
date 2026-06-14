"use client";

import { useEffect, useState } from "react";
import { routes } from "@/lib/api-routes";
import { useSession } from "@/components/providers/session-provider";
import type { MediaUrlResponse } from "@/lib/types";
import { cn } from "@/lib/cn";

type StorageImageThumbProps = {
  storageKey?: string | null;
  /** Catalog/public images — предпочтительно из API, без GET /media/url */
  imageUrl?: string | null;
  alt?: string;
  size?: "sm" | "md";
  className?: string;
  /** When true (default), only fetch URL for keys under uploads/{currentUserId}/ */
  ownedOnly?: boolean;
};

const sizeClass = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
};

function isOwnedStorageKey(storageKey: string, userId: string | undefined): boolean {
  if (!userId) return false;
  return storageKey.startsWith(`uploads/${userId}/`);
}

function truncateKey(key: string, max = 28): string {
  if (key.length <= max) return key;
  return `${key.slice(0, max - 1)}…`;
}

export function StorageImageThumb({
  storageKey,
  imageUrl,
  alt = "",
  size = "sm",
  className,
  ownedOnly = true,
}: StorageImageThumbProps) {
  const { api, user } = useSession();
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(imageUrl ?? null);
  const [failed, setFailed] = useState(false);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (imageUrl) {
      setResolvedUrl(imageUrl);
      setFailed(false);
      setSkipped(false);
      return;
    }
    if (!storageKey) {
      setResolvedUrl(null);
      setFailed(false);
      setSkipped(false);
      return;
    }
    if (ownedOnly && !isOwnedStorageKey(storageKey, user?.id)) {
      setResolvedUrl(null);
      setFailed(false);
      setSkipped(true);
      return;
    }
    setSkipped(false);
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<MediaUrlResponse>(routes.media.url(storageKey));
        if (!cancelled) {
          setResolvedUrl(res.url);
          setFailed(false);
        }
      } catch {
        if (!cancelled) {
          setResolvedUrl(null);
          setFailed(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, imageUrl, storageKey, ownedOnly, user?.id]);

  if (!imageUrl && !storageKey) {
    return (
      <span className="text-xs text-muted-foreground">—</span>
    );
  }

  if (skipped) {
    return (
      <span
        className="max-w-[140px] truncate text-xs text-muted-foreground"
        title={storageKey ?? undefined}
      >
        {storageKey ? truncateKey(storageKey) : "—"}
      </span>
    );
  }

  if (failed || !resolvedUrl) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-lg bg-muted text-[10px] text-muted-foreground",
          sizeClass[size],
          className,
        )}
        title={storageKey ?? undefined}
      >
        ?
      </span>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      className={cn(
        "rounded-lg border border-border object-cover",
        sizeClass[size],
        className,
      )}
    />
  );
}
