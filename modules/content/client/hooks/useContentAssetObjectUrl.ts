import { useEffect, useState } from "react";

import { api } from "@rewindom/module-sdk/client";

export function useContentAssetObjectUrl(
  contentId: string,
  assetId: string | null,
  enabled: boolean,
): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !assetId) {
      setUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    void api
      .getBlob(`/contents/${contentId}/assets/${assetId}/file`)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [assetId, contentId, enabled]);

  return url;
}
