"use client";

import { useRef, useEffect, useState } from "react";

interface LazyVideoProps {
  src?: string;
  posterUrl?: string;
  className?: string;
}

/**
 * IntersectionObserver-based lazy video loader.
 *
 * - Shows only the poster image until the container scrolls into view.
 * - On intersection, mounts the real `<video>` element with `preload="none"`.
 * - On unmount, explicitly releases the video buffer to free memory.
 */
export function LazyVideo({ src, posterUrl, className }: LazyVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Clean up video buffer on unmount
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    };
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {visible && src ? (
        <video
          ref={videoRef}
          src={src}
          controls
          className="w-full"
          preload="none"
          poster={posterUrl}
        />
      ) : posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={posterUrl}
          alt=""
          className="w-full object-cover"
        />
      ) : (
        <div className="flex aspect-video items-center justify-center bg-muted/30 text-sm text-muted-foreground">
          Video
        </div>
      )}
    </div>
  );
}
