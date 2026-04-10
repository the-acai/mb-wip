"use client";

import { useState, useCallback, useRef, useLayoutEffect } from "react";
import { motion, animate, type AnimationPlaybackControls } from "motion/react";
import gsap from "gsap";
import { useDropzone } from "react-dropzone";
import { ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { CursorCollapseIcon } from "@/components/expanded/cursor-collapse-icon";
import { useUploadModal } from "./upload-modal-context";
import { useUser } from "@/hooks/use-user";
import { getAuthorColor } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { uploadFile } from "@/lib/queries/storage";
import { createPost } from "@/lib/queries/posts";

// Same spring as experiment card expansion
const EXPANSION_SPRING = {
  type: "spring" as const,
  mass: 1.2,
  stiffness: 170,
  damping: 16,
};

const ROW_BREATH = 0.06; // 60ms

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES: Record<string, string[]> = {
  "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
  "video/webm": [".webm"],
};

export function UploadModalOverlay() {
  const { close, buttonPillRef } = useUploadModal();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const modalRef = useRef<HTMLDivElement>(null);
  const userRowRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const uploadAreaRef = useRef<HTMLDivElement>(null);
  const readyBtnRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);

  // Animation handles for cleanup / reversal
  const morphRef = useRef<AnimationPlaybackControls | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const buttonRectRef = useRef<DOMRect | null>(null);

  const [marqueeActive, setMarqueeActive] = useState(false);
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const userColor = userName ? getAuthorColor(userName) : "#dfe0e0";

  // ─── Animation: Motion spring for morph, GSAP timeline for interior stagger ───
  useLayoutEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    // Capture button rect
    const pill = buttonPillRef.current;
    const buttonRect = pill
      ? pill.getBoundingClientRect()
      : new DOMRect(window.innerWidth / 2 - 80, window.innerHeight - 80, 160, 48);
    buttonRectRef.current = buttonRect;

    const modalWidth = 544;

    // Measure final modal height at full width
    const savedCss = modal.style.cssText;
    modal.style.cssText = `
      position: fixed; width: ${modalWidth}px; padding: 24px;
      height: auto; visibility: hidden; left: 0; top: 0;
      display: flex; flex-direction: column; gap: 32px;
    `;
    const finalHeight = modal.offsetHeight;
    modal.style.cssText = savedCss;

    const finalLeft = (window.innerWidth - modalWidth) / 2;
    const finalTop = (window.innerHeight - finalHeight) / 2;

    // Set modal to button rect (starting state)
    Object.assign(modal.style, {
      position: "fixed",
      left: `${buttonRect.left}px`,
      top: `${buttonRect.top}px`,
      width: `${buttonRect.width}px`,
      height: `${buttonRect.height}px`,
      borderRadius: `${buttonRect.height / 2}px`,
      padding: "0px",
      overflow: "hidden",
      opacity: "1",
      visibility: "visible",
    });

    // Hide interior elements for the stagger
    [userRowRef, captionRef, uploadAreaRef, readyBtnRef, arrowRef].forEach((ref) => {
      if (ref.current) gsap.set(ref.current, { autoAlpha: 0 });
    });

    // ── Phase 1: Motion spring morph (position, size, borderRadius) ──
    const morphControls = animate(modal, {
      left: `${finalLeft}px`,
      top: `${finalTop}px`,
      width: `${modalWidth}px`,
      height: `${finalHeight}px`,
      borderRadius: "40px",
      padding: "24px",
    }, EXPANSION_SPRING);

    morphRef.current = morphControls;

    // ── Phase 2: GSAP timeline for interior stagger ──
    // Start after a short delay so the morph is underway
    const tl = gsap.timeline({ paused: true, onComplete: () => setMarqueeActive(true) });

    // 2a: @user tag — slide up
    tl.fromTo(
      userRowRef.current,
      { autoAlpha: 0, y: 16 },
      { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" },
    );

    // 2b: Caption — scale in from left
    tl.fromTo(
      captionRef.current,
      { autoAlpha: 0, scaleX: 0, transformOrigin: "left center" },
      { autoAlpha: 1, scaleX: 1, duration: 0.4, ease: "power2.out" },
      `>-${0.4 - ROW_BREATH}`,
    );

    // 2c: Upload area — slide up
    tl.fromTo(
      uploadAreaRef.current,
      { autoAlpha: 0, y: 16 },
      { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" },
      `>-${0.4 - ROW_BREATH}`,
    );

    // 2dI: I'M READY container — scale in on X
    tl.fromTo(
      readyBtnRef.current,
      { autoAlpha: 0, scaleX: 0, transformOrigin: "left center" },
      { autoAlpha: 1, scaleX: 1, duration: 0.4, ease: "power2.out" },
      `>-${0.4 - ROW_BREATH}`,
    );

    // 2dII: Arrow — slide in from left
    tl.fromTo(
      arrowRef.current,
      { autoAlpha: 0, x: -48 },
      { autoAlpha: 1, x: 0, duration: 0.4, ease: "power2.out" },
      `>-${0.4 - ROW_BREATH}`,
    );

    tlRef.current = tl;

    // Start the interior stagger 250ms after the morph begins
    const staggerTimer = setTimeout(() => tl.play(), 250);

    return () => {
      clearTimeout(staggerTimer);
      morphControls.stop();
      tl.kill();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Close: reverse GSAP stagger, then spring-morph back to button ───
  const handleClose = useCallback(() => {
    const tl = tlRef.current;
    const modal = modalRef.current;
    const buttonRect = buttonRectRef.current;

    setMarqueeActive(false);

    // Stop any in-progress morph
    morphRef.current?.stop();

    if (!tl || !modal || !buttonRect) {
      close();
      return;
    }

    // Reverse interior elements
    tl.eventCallback("onReverseComplete", () => {
      // Spring back to button rect
      const reverseControls = animate(modal, {
        left: `${buttonRect.left}px`,
        top: `${buttonRect.top}px`,
        width: `${buttonRect.width}px`,
        height: `${buttonRect.height}px`,
        borderRadius: `${buttonRect.height / 2}px`,
        padding: "0px",
      }, {
        ...EXPANSION_SPRING,
        onComplete: () => close(),
      });

      morphRef.current = reverseControls;
    });

    tl.reverse();
  }, [close]);

  // ─── File handling ───
  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [...prev, ...accepted]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: true,
  });

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) pastedFiles.push(file);
      }
    }
    if (pastedFiles.length > 0) {
      setFiles((prev) => [...prev, ...pastedFiles]);
    }
  }, []);

  // ─── Submit ───
  const handleSubmit = useCallback(async () => {
    if (submitting || files.length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const tempId = crypto.randomUUID();

      const assets = await Promise.all(
        files.map((file) => uploadFile(supabase, file, user!.id, tempId))
      );

      await createPost(supabase, {
        title: caption.trim() || "Untitled",
        body: caption.trim() || undefined,
        assets,
      });

      queryClient.invalidateQueries({ queryKey: ["feed"] });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setSubmitting(false);
    }
  }, [submitting, files, user, caption, queryClient, handleClose]);

  // ─── Marquee content ───
  const marqueeItems = (
    <span className="flex shrink-0 items-center gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <span key={i} className="flex items-center gap-2">
          <span className="font-heading text-base font-bold text-[var(--page-bg)] whitespace-nowrap">
            SEND IT
          </span>
          <ArrowRight className="size-3 text-[var(--page-bg)]" />
        </span>
      ))}
    </span>
  );

  return (
    <motion.div
      className="fixed inset-0 z-40"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onPaste={handlePaste}
    >
      {/* Backdrop with cursor-follow dismiss */}
      <CursorCollapseIcon onDismiss={handleClose}>
        <motion.div
          className="absolute inset-0 bg-[var(--page-bg)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.96 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </CursorCollapseIcon>

      {/* Modal — Motion spring for morph, GSAP for interior stagger */}
      <div
        ref={modalRef}
        className="z-50 flex flex-col gap-8 bg-[#0e1708]"
        style={{ visibility: "hidden" }}
      >
        {/* Marquee row */}
        <div className="flex items-center overflow-hidden">
          <div
            className="flex gap-0"
            style={
              marqueeActive
                ? { animation: "marquee-scroll 10s linear infinite" }
                : undefined
            }
          >
            {marqueeItems}
            {marqueeActive && marqueeItems}
          </div>
        </div>

        {/* @user tag (2a) */}
        <div ref={userRowRef} className="flex w-full items-center gap-2">
          <div
            className="flex h-14 shrink-0 items-center justify-center rounded-lg px-4"
            style={{ backgroundColor: userColor }}
          >
            <span className="font-heading text-base leading-[1.28] tracking-[-0.16px] text-[#f7f8f8] whitespace-nowrap">
              @{userName}
            </span>
          </div>

          {/* Caption input (2b) */}
          <div ref={captionRef} className="flex-1">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="is designing the greatest thing since sliced bread."
              className="h-14 w-full rounded-lg border border-[#3d4141] bg-[#222520] px-4 font-heading text-base leading-[1.28] tracking-[-0.16px] text-[#f7f8f8] placeholder:text-[#8b8b8b] focus:outline-none"
            />
          </div>
        </div>

        {/* Upload area (2c) */}
        <div ref={uploadAreaRef}>
          <div
            {...getRootProps()}
            className={`flex h-[240px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border transition-colors ${
              isDragActive
                ? "border-[#f7f8f8] bg-[#2a2d28]"
                : "border-[#3d4141] bg-[#222520]"
            }`}
          >
            <input {...getInputProps()} />
            {files.length > 0 ? (
              <div className="flex flex-col items-center gap-2">
                <p className="font-heading text-base leading-[1.28] tracking-[-0.16px] text-[#d3d3d3]">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </p>
                <p className="font-heading text-base leading-[1.28] tracking-[-0.16px] text-[#8b8b8b]">
                  Drop more or click to add.
                </p>
              </div>
            ) : (
              <>
                <p className="font-heading text-base leading-[1.28] tracking-[-0.16px] text-[#d3d3d3] text-center">
                  Drag and drop your work. Or &#8984;V.
                </p>
                <p className="font-heading text-base leading-[1.28] tracking-[-0.16px] text-[#8b8b8b]">
                  Max size 10MB.
                </p>
                <p className="font-heading text-base leading-[1.28] tracking-[-0.16px] text-[#8b8b8b]">
                  png, jpg, gif, webp, webm, svg
                </p>
              </>
            )}
          </div>
        </div>

        {/* I'M READY button (2d) */}
        <div className="flex w-full items-center gap-0.5">
          <div ref={readyBtnRef} className="flex-1">
            <button
              onClick={handleSubmit}
              disabled={submitting || files.length === 0}
              className="flex h-12 w-full items-center justify-center rounded-full bg-[#f7f8f8] px-6 disabled:opacity-50"
            >
              <span className="font-heading text-base font-bold leading-[1.28] tracking-[-0.16px] text-[#0e1708] whitespace-nowrap">
                {submitting ? "SENDING..." : "I'M READY"}
              </span>
            </button>
          </div>

          <div ref={arrowRef}>
            <span className="flex size-12 items-center justify-center rounded-full bg-[#f7f8f8]">
              <ArrowRight className="size-5 text-[#0e1708]" />
            </span>
          </div>
        </div>

        {error && (
          <p className="font-heading text-sm text-red-400 text-center">
            {error}
          </p>
        )}
      </div>
    </motion.div>
  );
}
