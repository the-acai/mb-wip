"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  UploadIcon,
  XIcon,
  PlayCircleIcon,
  ImageIcon,
} from "lucide-react";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const ACCEPTED_TYPES: Record<string, string[]> = {
  "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
  "video/webm": [".webm"],
};

interface MediaUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

function getFilePreview(file: File): string | null {
  if (file.type.startsWith("image/")) {
    return URL.createObjectURL(file);
  }
  return null;
}

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("video/")) {
    return <PlayCircleIcon className="size-8 text-muted-foreground" />;
  }
  return <ImageIcon className="size-8 text-muted-foreground" />;
}

export function MediaUploader({ files, onFilesChange }: MediaUploaderProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      onFilesChange([...files, ...accepted]);
    },
    [files, onFilesChange]
  );

  const removeFile = useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index));
    },
    [files, onFilesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: true,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <input {...getInputProps()} />
        <UploadIcon className="mb-2 size-8 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-sm font-medium text-primary">Drop files here</p>
        ) : (
          <>
            <p className="text-sm font-medium">
              Drag & drop files, or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Images, GIF, video up to 10MB
            </p>
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {files.map((file, index) => {
            const preview = getFilePreview(file);
            return (
              <div
                key={`${file.name}-${index}`}
                className="group relative overflow-hidden rounded-lg border bg-muted/30"
              >
                <div className="flex aspect-square items-center justify-center">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt={file.name}
                      className="size-full object-cover"
                      onLoad={() => URL.revokeObjectURL(preview)}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <FileTypeIcon mimeType={file.type} />
                      {file.type.startsWith("video/") && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <PlayCircleIcon className="size-10 text-foreground/70" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="border-t bg-background px-2 py-1.5">
                  <p className="truncate text-xs text-muted-foreground">
                    {file.name}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                >
                  <XIcon />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
