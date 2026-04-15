"use client";

import { useRef, useEffect } from "react";

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
 * Tracks visibility via a ref so the `canplay` event can trigger play() when
 * the video finishes loading while already in the viewport.
 *
 * The video buffer is explicitly released on unmount to free memory.
 */
export function FeedVideo({ src, posterUrl, className }: FeedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const visibleRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const play = () => {
      if (visibleRef.current && video.readyState >= 2) {
        video.play().catch(() => {});
      }
    };

    // When data is ready and we're already visible, start playback
    video.addEventListener("canplay", play);

    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          play();
        } else {
          video.pause();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
      video.removeEventListener("canplay", play);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

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
