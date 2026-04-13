"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface Asset {
  file_path: string;
  mime_type: string;
  signed_url?: string;
  width?: number | null;
  height?: number | null;
}

interface MediaGalleryProps {
  assets: Asset[];
}

interface LightboxAsset {
  url: string;
  width: number;
  height: number;
}

// Reasonable defaults when an older asset has no stored dimensions — these
// only inform next/image's optimizer, CSS still controls display.
const FALLBACK_W = 1600;
const FALLBACK_H = 1200;

export function MediaGallery({ assets }: MediaGalleryProps) {
  const [lightbox, setLightbox] = useState<LightboxAsset | null>(null);

  if (!assets.length) return null;

  const images = assets.filter((a) => a.mime_type.startsWith("image/"));
  const videos = assets.filter((a) => a.mime_type.startsWith("video/"));
  return (
    <div className="space-y-6">
      {/* Images grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {images.map((asset) => (
            <button
              key={asset.file_path}
              type="button"
              className="group relative aspect-video w-full overflow-hidden rounded-lg border bg-muted/30 transition-colors hover:border-primary/30"
              onClick={() =>
                asset.signed_url &&
                setLightbox({
                  url: asset.signed_url,
                  width: asset.width ?? FALLBACK_W,
                  height: asset.height ?? FALLBACK_H,
                })
              }
            >
              {asset.signed_url && (
                <Image
                  src={asset.signed_url}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover transition-transform group-hover:scale-[1.02]"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div className="space-y-3">
          {videos.map((asset) => (
            <div
              key={asset.file_path}
              className="overflow-hidden rounded-lg border"
            >
              <video
                src={asset.signed_url}
                controls
                className="w-full"
                preload="metadata"
              />
            </div>
          ))}
        </div>
      )}

      {/* Lightbox dialog */}
      <Dialog
        open={lightbox !== null}
        onOpenChange={(open) => {
          if (!open) setLightbox(null);
        }}
      >
        <DialogContent className="max-w-3xl p-2" showCloseButton>
          <DialogTitle className="sr-only">Image preview</DialogTitle>
          {lightbox && (
            <Image
              src={lightbox.url}
              alt=""
              width={lightbox.width}
              height={lightbox.height}
              sizes="(max-width: 768px) 100vw, 768px"
              className="h-auto w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
