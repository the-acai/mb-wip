"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface Asset {
  file_path: string;
  mime_type: string;
  signed_url?: string;
}

interface MediaGalleryProps {
  assets: Asset[];
}

export function MediaGallery({ assets }: MediaGalleryProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

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
              className="group overflow-hidden rounded-lg border bg-muted/30 transition-colors hover:border-primary/30"
              onClick={() => setLightboxUrl(asset.signed_url ?? null)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.signed_url}
                alt=""
                className="aspect-video w-full object-cover transition-transform group-hover:scale-[1.02]"
              />
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
        open={lightboxUrl !== null}
        onOpenChange={(open) => {
          if (!open) setLightboxUrl(null);
        }}
      >
        <DialogContent className="max-w-3xl p-2" showCloseButton>
          <DialogTitle className="sr-only">Image preview</DialogTitle>
          {lightboxUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightboxUrl}
              alt=""
              className="w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
