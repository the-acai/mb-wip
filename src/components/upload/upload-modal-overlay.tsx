"use client";

import { useState, useCallback, useRef, useLayoutEffect } from "react";
import { motion } from "motion/react";
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
  const marqueeRef = useRef<HTMLDivElement>(null);
  const userRowRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const uploadAreaRef = useRef<HTMLDivElement>(null);
  const readyBtnRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const [marqueeActive, setMarqueeActive] = useState(false);
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const userColor = userName ? getAuthorColor(userName) : "#dfe0e0";

  // ─── GSAP timeline: morph from button rect → modal, stagger interior ───
  useLayoutEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    // Get button rect (or fall back to viewport center)
    const pill = buttonPillRef.current;
    const buttonRect = pill
      ? pill.getBoundingClientRect()
      : { left: window.innerWidth / 2 - 80, top: window.innerHeight - 80, width: 160, height: 48 };

    // Final modal position: centered, 544px wide
    const modalWidth = 544;
    const finalLeft = (window.innerWidth - modalWidth) / 2;

    // Set modal to button's rect instantly (invisible start handled by autoAlpha)
    gsap.set(modal, {
      position: "fixed",
      left: buttonRect.left,
      top: buttonRect.top,
      width: buttonRect.width,
      height: buttonRect.height,
      borderRadius: buttonRect.height / 2, // pill shape
      padding: 0,
      autoAlpha: 1,
      overflow: "hidden",
    });

    // Hide interior elements
    const interiors = [userRowRef, captionRef, uploadAreaRef, readyBtnRef, arrowRef];
    interiors.forEach((ref) => {
      if (ref.current) gsap.set(ref.current, { autoAlpha: 0 });
    });

    // Build the timeline
    const tl = gsap.timeline({
      defaults: { ease: "power3.inOut" },
      onComplete: () => setMarqueeActive(true),
    });

    // Phase 1: Morph from button → modal
    tl.to(modal, {
      left: finalLeft,
      top: "50%",
      yPercent: -50,
      width: modalWidth,
      height: "auto",
      borderRadius: 40,
      padding: 24,
      duration: 0.5,
      ease: "power3.inOut",
    });

    // Phase 2: Stagger interior elements (overlapping with end of morph)
    const staggerStart = "-=0.2"; // begin 200ms before morph finishes

    // 2a: @user tag — slide up
    tl.fromTo(
      userRowRef.current,
      { autoAlpha: 0, y: 16 },
      { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" },
      staggerStart
    );

    // 2b: Caption — scale in from left
    tl.fromTo(
      captionRef.current,
      { autoAlpha: 0, scaleX: 0, transformOrigin: "left center" },
      { autoAlpha: 1, scaleX: 1, duration: 0.4, ease: "power2.out" },
      `>-${0.4 - ROW_BREATH}` // stagger by ROW_BREATH from 2a
    );

    // 2c: Upload area — slide up
    tl.fromTo(
      uploadAreaRef.current,
      { autoAlpha: 0, y: 16 },
      { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" },
      `>-${0.4 - ROW_BREATH}`
    );

    // 2dI: I'M READY container — scale in on X
    tl.fromTo(
      readyBtnRef.current,
      { autoAlpha: 0, scaleX: 0, transformOrigin: "left center" },
      { autoAlpha: 1, scaleX: 1, duration: 0.4, ease: "power2.out" },
      `>-${0.4 - ROW_BREATH}`
    );

    // 2dII: Arrow — slide in from left
    tl.fromTo(
      arrowRef.current,
      { autoAlpha: 0, x: -48 },
      { autoAlpha: 1, x: 0, duration: 0.4, ease: "power2.out" },
      `>-${0.4 - ROW_BREATH}`
    );

    tlRef.current = tl;

    return () => {
      tl.kill();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Close handler: reverse timeline, then unmount ───
  const handleClose = useCallback(() => {
    const tl = tlRef.current;
    if (!tl) {
      close();
      return;
    }

    setMarqueeActive(false);

    tl.eventCallback("onReverseComplete", () => {
      close();
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

      {/* Modal — GSAP animates position/size from button rect */}
      <div
        ref={modalRef}
        className="z-50 flex flex-col gap-8 bg-[#0e1708]"
        style={{ visibility: "hidden" /* autoAlpha handles this */ }}
      >
        {/* Marquee row */}
        <div ref={marqueeRef} className="flex items-center overflow-hidden">
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
          {/* Container scales in (2dI) */}
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

          {/* Arrow slides in (2dII) */}
          <div ref={arrowRef}>
            <span className="flex size-12 items-center justify-center rounded-full bg-[#f7f8f8]">
              <ArrowRight className="size-5 text-[#0e1708]" />
            </span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="font-heading text-sm text-red-400 text-center">
            {error}
          </p>
        )}
      </div>
    </motion.div>
  );
}
