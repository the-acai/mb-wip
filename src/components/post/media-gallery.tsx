"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileTextIcon, DownloadIcon } from "lucide-react";

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
  const pdfs = assets.filter((a) => a.mime_type === "application/pdf");

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

      {/* PDFs */}
      {pdfs.length > 0 && (
        <div className="space-y-2">
          {pdfs.map((asset) => {
            const fileName =
              asset.file_path.split("/").pop() ?? "document.pdf";
            return (
              <div
                key={asset.file_path}
                className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3"
              >
                <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {fileName}
                </span>
                <a
                  href={asset.signed_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
                >
                  <DownloadIcon className="size-3.5" />
                  Download
                </a>
              </div>
            );
          })}
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
