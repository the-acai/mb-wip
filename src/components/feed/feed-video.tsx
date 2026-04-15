"use client";

import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";

export interface FeedVideoHandle {
  getCurrentTime: () => number;
}

interface FeedVideoProps {
  src: string;
  posterUrl?: string;
  className?: string;
  /** Resume playback from this timecode (seconds) on mount. */
  startTime?: number;
}

/**
 * Autoplay muted looping video for feed cards and the expanded overlay.
 *
 * Uses IntersectionObserver to play only when >=50% visible and pause when
 * scrolled away. No controls are rendered — this is a silent ambient preview,
 * similar to Pinterest or Cosmos.
 *
 * Exposes a `FeedVideoHandle` via ref so parents can read the current
 * timecode (for seamless handoff to the expanded overlay).
 *
 * The video buffer is explicitly released on unmount to free memory.
 */
export const FeedVideo = forwardRef<FeedVideoHandle, FeedVideoProps>(
  function FeedVideo({ src, posterUrl, className, startTime }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const visibleRef = useRef(false);
    const seekedRef = useRef(false);
    const lastPlaybackTimeRef = useRef(0);
    const wasPlayingBeforeHideRef = useRef(false);
    const resumeOnVisibleRef = useRef(false);

    useImperativeHandle(ref, () => ({
      getCurrentTime: () => videoRef.current?.currentTime ?? 0,
    }));

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      seekedRef.current = false;
      lastPlaybackTimeRef.current = 0;
      wasPlayingBeforeHideRef.current = false;
      resumeOnVisibleRef.current = false;

      const canAutoplay = () =>
        visibleRef.current && document.visibilityState === "visible";

      const seekBeforePlay = () => {
        if (resumeOnVisibleRef.current) {
          video.currentTime = lastPlaybackTimeRef.current;
          resumeOnVisibleRef.current = false;
          return;
        }

        // Seek to startTime once before first play
        if (startTime != null && !seekedRef.current) {
          seekedRef.current = true;
          video.currentTime = startTime;
        }
      };

      const play = () => {
        if (!canAutoplay() || video.readyState < 2) return;

        seekBeforePlay();
        video.play().catch(() => {});
      };

      const pauseAndRememberPlayback = () => {
        lastPlaybackTimeRef.current = video.currentTime;
        wasPlayingBeforeHideRef.current = !video.paused && !video.ended;
        resumeOnVisibleRef.current = wasPlayingBeforeHideRef.current;
        video.pause();
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
          pauseAndRememberPlayback();
          return;
        }

        if (document.visibilityState === "visible") {
          play();
        }
      };

      const handlePageHide = () => {
        pauseAndRememberPlayback();
      };

      const handleReturnToTab = () => {
        play();
      };

      // When data is ready and we're already visible, start playback
      video.addEventListener("canplay", play);

      const observer = new IntersectionObserver(
        ([entry]) => {
          visibleRef.current = entry.intersectionRatio >= 0.5;
          if (visibleRef.current) {
            play();
          } else {
            lastPlaybackTimeRef.current = video.currentTime;
            video.pause();
          }
        },
        { threshold: 0.5 }
      );

      observer.observe(video);
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("pagehide", handlePageHide);
      window.addEventListener("pageshow", handleReturnToTab);
      window.addEventListener("focus", handleReturnToTab);

      return () => {
        observer.disconnect();
        video.removeEventListener("canplay", play);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("pagehide", handlePageHide);
        window.removeEventListener("pageshow", handleReturnToTab);
        window.removeEventListener("focus", handleReturnToTab);
        video.pause();
        video.removeAttribute("src");
        video.load();
      };
    }, [src, startTime]);

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
);
