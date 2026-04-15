"use client";

import { useRef, useEffect, useCallback } from "react";

interface FeedVideoProps {
  src: string;
  posterUrl?: string;
  className?: string;
}

/**
 * Autoplay muted looping video for feed cards and the expanded overlay.
 *
 * Uses IntersectionObserver to play only when >=50% visible and pause when
 * scrolled away. No controls are rendered — this is a silent ambient preview,
 * similar to Pinterest or Cosmos.
 *
 * The video buffer is explicitly released on unmount to free memory.
 */
export function FeedVideo({ src, posterUrl, className }: FeedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const tryPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    video.play().catch(() => {});
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          tryPlay();
        } else {
          video.pause();
        }
      },
      { threshold: 0.5 }
    );

    observerRef.current.observe(video);

    return () => {
      observerRef.current?.disconnect();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [tryPlay]);

  return (
    <video
      ref={videoRef}
      src={src}
      muted
      loop
      playsInline
      preload="auto"
      poster={posterUrl}
      className={className}
    />
  );
}
