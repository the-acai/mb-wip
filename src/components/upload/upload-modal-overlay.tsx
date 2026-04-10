"use client";

import { useState, useCallback, useRef, useLayoutEffect } from "react";
import { motion } from "motion/react";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
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

gsap.registerPlugin(Flip);

const EXPANSION_SPRING = {
  type: "spring" as const,
  mass: 1.2,
  stiffness: 170,
  damping: 16,
};

const ROW_BREATH = 0.06;
const MORPH_DURATION = 0.6;
const MORPH_EASE = "expo.out";
const INTERIOR_DURATION = 0.4;
const INTERIOR_EASE = "power2.out";
const INTERIOR_START = 0.25;

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
  const heroRef = useRef<HTMLDivElement>(null);
  const marqueeRowRef = useRef<HTMLDivElement>(null);
  const marqueeInnerRef = useRef<HTMLDivElement>(null);
  const userRowRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const uploadAreaRef = useRef<HTMLDivElement>(null);
  const readyBtnRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);

  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const [closing, setClosing] = useState(false);
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const userColor = userName ? getAuthorColor(userName) : "#dfe0e0";

  // ─── Build GSAP timeline with Flip ───
  useLayoutEffect(() => {
    const modal = modalRef.current;
    const hero = heroRef.current;
    const marqueeRow = marqueeRowRef.current;
    const marqueeInner = marqueeInnerRef.current;
    if (!modal || !hero || !marqueeRow) return;

    const pill = buttonPillRef.current;
    const btnRect = pill
      ? pill.getBoundingClientRect()
      : new DOMRect(window.innerWidth / 2 - 80, window.innerHeight - 80, 160, 48);

    const modalWidth = 544;
    const modalPadding = 24;
    const contentWidth = modalWidth - modalPadding * 2;

    // ── Measure final modal height ──
    const savedCss = modal.style.cssText;
    modal.style.cssText = `
      position: fixed; width: ${modalWidth}px; padding: ${modalPadding}px;
      height: auto; visibility: hidden; left: 0; top: 0;
      display: flex; flex-direction: column; gap: 32px;
    `;
    const finalHeight = modal.offsetHeight;
    modal.style.cssText = savedCss;

    const finalLeft = (window.innerWidth - modalWidth) / 2;
    const finalTop = (window.innerHeight - finalHeight) / 2;
    const marqueeX = finalLeft + modalPadding;
    const marqueeY = finalTop + modalPadding;

    // ── 1. Set start positions (button rect) ──
    gsap.set(modal, {
      position: "fixed",
      left: btnRect.left, top: btnRect.top,
      width: btnRect.width, height: btnRect.height,
      borderRadius: btnRect.height / 2,
      padding: 0, overflow: "hidden", autoAlpha: 1,
    });

    gsap.set(hero, {
      position: "fixed", zIndex: 60,
      left: btnRect.left, top: btnRect.top,
      width: btnRect.width, height: btnRect.height,
      autoAlpha: 1,
      display: "flex", alignItems: "center", justifyContent: "center",
    });

    // Hide marquee + interiors
    gsap.set(marqueeRow, { autoAlpha: 0 });

    // ── 2. Capture start states with Flip ──
    const modalStartState = Flip.getState(modal);
    const heroStartState = Flip.getState(hero);

    // ── 3. Set final positions ──
    gsap.set(modal, {
      left: finalLeft, top: finalTop,
      width: modalWidth, height: finalHeight,
      borderRadius: 40, padding: modalPadding,
    });

    gsap.set(hero, {
      left: marqueeX, top: marqueeY,
      width: contentWidth, height: 48,
      justifyContent: "flex-start",
    });

    // ── 4. Build timeline ──
    const tl = gsap.timeline({
      paused: true,
      onReverseComplete: () => close(),
      onUpdate(this: gsap.core.Timeline) {
        if (marqueeInner && this.reversed()) {
          marqueeInner.style.animation = "none";
        }
      },
    });

    // Modal Flip morph: from button rect → final center
    tl.add(
      Flip.from(modalStartState, {
        duration: MORPH_DURATION,
        ease: MORPH_EASE,
        absolute: true,
      }),
      0,
    );

    // Hero Flip: from button position → marquee position
    tl.add(
      Flip.from(heroStartState, {
        duration: MORPH_DURATION,
        ease: MORPH_EASE,
        absolute: true,
      }),
      0,
    );

    // Crossfade handoff: hero → marquee
    tl.to(hero, { autoAlpha: 0, duration: 0.12 }, MORPH_DURATION - 0.12);
    tl.to(marqueeRow, { autoAlpha: 1, duration: 0.12 }, MORPH_DURATION - 0.12);
    tl.call(() => {
      if (marqueeInner) {
        marqueeInner.style.animation = "marquee-scroll 10s linear infinite";
      }
    }, undefined, MORPH_DURATION);

    // Interior stagger
    const interiors: [React.RefObject<HTMLElement | null>, gsap.TweenVars, gsap.TweenVars][] = [
      [userRowRef, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0 }],
      [captionRef, { autoAlpha: 0, scaleX: 0, transformOrigin: "left center" }, { autoAlpha: 1, scaleX: 1 }],
      [uploadAreaRef, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0 }],
      [readyBtnRef, { autoAlpha: 0, scaleX: 0, transformOrigin: "left center" }, { autoAlpha: 1, scaleX: 1 }],
      [arrowRef, { autoAlpha: 0, x: -48 }, { autoAlpha: 1, x: 0 }],
    ];

    interiors.forEach(([ref, from, to], i) => {
      if (ref.current) {
        tl.fromTo(ref.current, from, {
          ...to, duration: INTERIOR_DURATION, ease: INTERIOR_EASE,
        }, INTERIOR_START + i * ROW_BREATH);
      }
    });

    tlRef.current = tl;
    tl.play();

    return () => { tl.kill(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Close ───
  const handleClose = useCallback(() => {
    setClosing(true);
    if (marqueeInnerRef.current) {
      marqueeInnerRef.current.style.animation = "none";
    }
    const tl = tlRef.current;
    if (!tl) { close(); return; }
    tl.reverse();
  }, [close]);

  // ─── File handling ───
  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [...prev, ...accepted]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: ACCEPTED_TYPES, maxSize: MAX_SIZE, multiple: true,
  });

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const file = items[i].getAsFile();
        if (file) pastedFiles.push(file);
      }
    }
    if (pastedFiles.length > 0) setFiles((prev) => [...prev, ...pastedFiles]);
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
    <div className="fixed inset-0 z-40" onPaste={handlePaste}>
      {/* Backdrop */}
      <CursorCollapseIcon onDismiss={handleClose}>
        <motion.div
          className="absolute inset-0 bg-[var(--page-bg)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: closing ? 0 : 0.96 }}
          transition={closing ? { duration: 0.2, ease: "easeOut" } : EXPANSION_SPRING}
        />
      </CursorCollapseIcon>

      {/* Hero text — single block, flies from button to marquee position */}
      <div
        ref={heroRef}
        className="pointer-events-none flex h-12 items-center gap-2 overflow-hidden"
        style={{ visibility: "hidden" }}
      >
        <span className="font-heading text-base font-bold text-[var(--page-bg)] whitespace-nowrap">
          SEND IT
        </span>
        <ArrowRight className="size-3 text-[var(--page-bg)]" />
      </div>

      {/* Modal */}
      <div
        ref={modalRef}
        className="z-50 flex flex-col gap-8 bg-[#0e1708]"
        style={{ visibility: "hidden" }}
      >
        {/* Marquee row — hidden until hero hands off */}
        <div ref={marqueeRowRef} className="flex h-12 items-center overflow-hidden" style={{ visibility: "hidden" }}>
          <div ref={marqueeInnerRef} className="flex gap-0">
            {marqueeItems}
            {marqueeItems}
          </div>
        </div>

        <div ref={userRowRef} className="flex w-full items-center gap-2">
          <div className="flex h-14 shrink-0 items-center justify-center rounded-lg px-4" style={{ backgroundColor: userColor }}>
            <span className="font-heading text-base leading-[1.28] tracking-[-0.16px] text-[#f7f8f8] whitespace-nowrap">@{userName}</span>
          </div>
          <div ref={captionRef} className="flex-1" style={{ transformOrigin: "left center" }}>
            <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)}
              placeholder="is designing the greatest thing since sliced bread."
              className="h-14 w-full rounded-lg border border-[#3d4141] bg-[#222520] px-4 font-heading text-base leading-[1.28] tracking-[-0.16px] text-[#f7f8f8] placeholder:text-[#8b8b8b] focus:outline-none" />
          </div>
        </div>

        <div ref={uploadAreaRef}>
          <div {...getRootProps()}
            className={`flex h-[240px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border transition-colors ${
              isDragActive ? "border-[#f7f8f8] bg-[#2a2d28]" : "border-[#3d4141] bg-[#222520]"}`}>
            <input {...getInputProps()} />
            {files.length > 0 ? (
              <div className="flex flex-col items-center gap-2">
                <p className="font-heading text-base leading-[1.28] tracking-[-0.16px] text-[#d3d3d3]">{files.length} file{files.length > 1 ? "s" : ""} selected</p>
                <p className="font-heading text-base leading-[1.28] tracking-[-0.16px] text-[#8b8b8b]">Drop more or click to add.</p>
              </div>
            ) : (
              <>
                <p className="font-heading text-base leading-[1.28] tracking-[-0.16px] text-[#d3d3d3] text-center">Drag and drop your work. Or &#8984;V.</p>
                <p className="font-heading text-base leading-[1.28] tracking-[-0.16px] text-[#8b8b8b]">Max size 10MB.</p>
                <p className="font-heading text-base leading-[1.28] tracking-[-0.16px] text-[#8b8b8b]">png, jpg, gif, webp, webm, svg</p>
              </>
            )}
          </div>
        </div>

        <div className="flex w-full items-center gap-0.5">
          <div ref={readyBtnRef} className="flex-1" style={{ transformOrigin: "left center" }}>
            <button onClick={handleSubmit} disabled={submitting || files.length === 0}
              className="flex h-12 w-full items-center justify-center rounded-full bg-[#f7f8f8] px-6 disabled:opacity-50">
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

        {error && <p className="font-heading text-sm text-red-400 text-center">{error}</p>}
      </div>
    </div>
  );
}
