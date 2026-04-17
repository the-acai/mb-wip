"use client";

import { useState, useCallback, useRef, useEffect, useLayoutEffect } from "react";
import { motion, animate, useMotionValue, useReducedMotion, type AnimationPlaybackControls } from "motion/react";
import gsap from "gsap";
import { useDropzone } from "react-dropzone";
import { ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { CursorCollapseIcon } from "@/components/expanded/cursor-collapse-icon";
import { useUploadModal } from "./upload-modal-context";
import { useUser } from "@/hooks/use-user";
import { useProfileColor } from "@/hooks/use-profile-color";
import { getAuthorColor } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { uploadFile } from "@/lib/queries/storage";
import { createPost } from "@/lib/queries/posts";
import { horizontalLoop } from "@/lib/gsap-horizontal-loop";
import { SPRING, INSTANT } from "@/lib/motion";

const ROW_BREATH_MS = 60;

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES: Record<string, string[]> = {
  "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
  "video/webm": [".webm"],
};

const MARQUEE_COUNT = 12;

// Optical match to the modal's 40px outer radius minus 24px padding.
const INNER_RADIUS = "rounded-[16px]";

export function UploadModalOverlay() {
  const { close, buttonPillRef } = useUploadModal();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const modalRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const marqueeRowRef = useRef<HTMLDivElement>(null);
  const userRowRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const uploadAreaRef = useRef<HTMLDivElement>(null);

  // All active animations — for cleanup and interruption
  const animsRef = useRef<AnimationPlaybackControls[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const loopRef = useRef<gsap.core.Timeline | null>(null);
  const buttonRectRef = useRef<DOMRect | null>(null);
  const isClosingRef = useRef(false);

  const [closing, setClosing] = useState(false);
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prefersReducedMotion = useReducedMotion();

  // Ready button + arrow visibility — animated via motion values.
  // The row collapses (height 0, marginTop -24 to eat the flex gap) when hidden;
  // the modal springs its own height to match.
  const readyOpacity = useMotionValue(0);
  const readyScaleX = useMotionValue(0);
  const arrowOpacity = useMotionValue(0);
  const arrowX = useMotionValue(-48);
  const rowHeight = useMotionValue(0);
  const rowMarginTop = useMotionValue(-24);
  const modalBaseHeightRef = useRef<number | null>(null);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const profileColor = useProfileColor();
  const userColor = userName ? getAuthorColor(userName, profileColor) : "var(--border-subtle)";

  /** Track an animation for later cleanup */
  const track = useCallback((ctrl: AnimationPlaybackControls) => {
    animsRef.current.push(ctrl);
    return ctrl;
  }, []);

  /** Schedule a timer and track it */
  const delay = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  }, []);

  /** Stop everything in flight */
  const stopAll = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    animsRef.current.forEach((a) => a.stop());
    animsRef.current = [];
  }, []);

  // ─── Open animation ───
  useLayoutEffect(() => {
    const modal = modalRef.current;
    const hero = heroRef.current;
    const marqueeRow = marqueeRowRef.current;
    if (!modal || !hero || !marqueeRow) return;

    const pill = buttonPillRef.current;
    const btnRect = pill
      ? pill.getBoundingClientRect()
      : new DOMRect(window.innerWidth / 2 - 80, window.innerHeight - 80, 160, 48);
    buttonRectRef.current = btnRect;

    const modalWidth = 544;
    const modalPadding = 24;
    const contentWidth = modalWidth - modalPadding * 2;

    // Measure final modal height
    const savedCss = modal.style.cssText;
    modal.style.cssText = `
      position: fixed; width: ${modalWidth}px; padding: ${modalPadding}px;
      height: auto; visibility: hidden; left: 0; top: 0;
      display: flex; flex-direction: column; gap: 24px;
    `;
    const finalHeight = modal.offsetHeight;
    modal.style.cssText = savedCss;
    // Measured with the ready row collapsed (initial motion values hide it) — this is the base.
    modalBaseHeightRef.current = finalHeight;

    const finalLeft = (window.innerWidth - modalWidth) / 2;
    const finalTop = (window.innerHeight - finalHeight) / 2;

    // Hero target: center of marquee area
    const heroMeasure = hero.getBoundingClientRect();
    const heroWidth = heroMeasure.width || 120;
    const heroTargetX = finalLeft + modalPadding + contentWidth / 2 - heroWidth / 2;
    const heroTargetY = finalTop + modalPadding;

    // ── Set starting states ──
    // Modal at button rect
    Object.assign(modal.style, {
      position: "fixed",
      left: `${btnRect.left}px`, top: `${btnRect.top}px`,
      width: `${btnRect.width}px`, height: `${btnRect.height}px`,
      borderRadius: `${btnRect.height / 2}px`,
      padding: "0px", overflow: "hidden",
      opacity: "1", visibility: "visible",
    });

    // Hero at button position (centered)
    Object.assign(hero.style, {
      position: "fixed", zIndex: "60",
      left: `${btnRect.left}px`, top: `${btnRect.top}px`,
      width: `${btnRect.width}px`, height: `${btnRect.height}px`,
      opacity: "1", visibility: "visible",
      display: "flex", alignItems: "center", justifyContent: "center",
    });

    // Marquee + interiors hidden
    marqueeRow.style.opacity = "0";
    marqueeRow.style.visibility = "visible";
    [userRowRef, captionRef, uploadAreaRef].forEach((ref) => {
      if (ref.current) {
        ref.current.style.opacity = "0";
        ref.current.style.visibility = "visible";
      }
    });

    // ── Set up marquee loop (needs to measure at final position briefly) ──
    const savedModalCss2 = modal.style.cssText;
    Object.assign(modal.style, {
      left: `${finalLeft}px`, top: `${finalTop}px`,
      width: `${modalWidth}px`, height: `${finalHeight}px`,
      borderRadius: "40px", padding: `${modalPadding}px`,
    });
    marqueeRow.style.opacity = "1";

    const marqueeItems = marqueeRow.querySelectorAll("[data-marquee-item]");
    const loop = horizontalLoop(marqueeItems, {
      speed: 1.5, repeat: -1, paused: true, paddingRight: 16,
    });
    loopRef.current = loop;

    // Restore modal to button rect
    modal.style.cssText = savedModalCss2;
    marqueeRow.style.opacity = "0";
    Object.assign(modal.style, {
      position: "fixed",
      left: `${btnRect.left}px`, top: `${btnRect.top}px`,
      width: `${btnRect.width}px`, height: `${btnRect.height}px`,
      borderRadius: `${btnRect.height / 2}px`,
      padding: "0px", overflow: "hidden",
      opacity: "1", visibility: "visible",
    });

    // ── Animate! ──

    // 1. Modal morph (spring)
    track(animate(modal, {
      left: `${finalLeft}px`, top: `${finalTop}px`,
      width: `${modalWidth}px`, height: `${finalHeight}px`,
      borderRadius: "40px", padding: `${modalPadding}px`,
    }, SPRING.default));

    // 2. Hero flies from button center → marquee center (spring)
    track(animate(hero, {
      left: `${heroTargetX}px`, top: `${heroTargetY}px`,
      width: `${heroWidth}px`, height: "48px",
    }, SPRING.default));

    // 3. Marquee + hero crossfade (hero flies over, then swaps with marquee)
    loop.play();
    delay(() => {
      track(animate(marqueeRow, { opacity: 1 }, { duration: 0.2 }));
      track(animate(hero, { opacity: 0 }, { duration: 0.2 }));
    }, 120);

    // 5. Interior stagger (ready button + arrow are gated by a separate effect)
    const interiorEntries: { ref: React.RefObject<HTMLElement | null>; to: Record<string, string | number> }[] = [
      { ref: userRowRef, to: { opacity: 1, y: 0 } },
      { ref: captionRef, to: { opacity: 1, scaleX: 1 } },
      { ref: uploadAreaRef, to: { opacity: 1, y: 0 } },
    ];

    // Set initial transforms (ready button + arrow manage their own state via motion.div)
    if (userRowRef.current) userRowRef.current.style.transform = "translateY(16px)";
    if (captionRef.current) { captionRef.current.style.transform = "scaleX(0)"; captionRef.current.style.transformOrigin = "left center"; }
    if (uploadAreaRef.current) uploadAreaRef.current.style.transform = "translateY(16px)";

    delay(() => {
      interiorEntries.forEach(({ ref, to }, i) => {
        delay(() => {
          if (ref.current) track(animate(ref.current, to, SPRING.default));
        }, i * ROW_BREATH_MS);
      });
    }, 200);

    return () => {
      stopAll();
      loop.kill();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Close ───
  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setClosing(true);

    const modal = modalRef.current;
    const hero = heroRef.current;
    const marqueeRow = marqueeRowRef.current;
    // Re-measure pill rect — it may be narrower now than at open time
    // (hover state widens pill from px-6 to px-8, adds 16px)
    const pill = buttonPillRef.current;
    const btnRect = pill ? pill.getBoundingClientRect() : buttonRectRef.current;

    stopAll();

    if (!modal || !hero || !marqueeRow || !btnRect) {
      close();
      return;
    }

    const anims: AnimationPlaybackControls[] = [];

    // 1. Hero appears over the scrolling marquee
    anims.push(animate(hero, { opacity: 1 }, { duration: 0.1 }));

    // 2. Interior elements retract (ready button + arrow animate themselves via motion.div)
    const reverseEntries: { ref: React.RefObject<HTMLElement | null>; to: Record<string, string | number> }[] = [
      { ref: uploadAreaRef, to: { opacity: 0, y: 16 } },
      { ref: captionRef, to: { opacity: 0, scaleX: 0 } },
      { ref: userRowRef, to: { opacity: 0, y: 16 } },
    ];
    reverseEntries.forEach(({ ref, to }) => {
      if (ref.current) anims.push(animate(ref.current, to, { ...SPRING.default, mass: 0.8 }));
    });

    // 3. After brief moment: hero flies back, marquee fades, modal morphs
    const closeTimer = setTimeout(() => {
      // Hero flies back to button
      anims.push(animate(hero, {
        left: `${btnRect.left}px`, top: `${btnRect.top}px`,
        width: `${btnRect.width}px`, height: `${btnRect.height}px`,
        justifyContent: "center",
      }, SPRING.default));

      // Marquee fades out while hero is leaving
      anims.push(animate(marqueeRow, { opacity: 0 }, { duration: 0.15 }));

      // Pause the loop after marquee is invisible
      setTimeout(() => { loopRef.current?.pause(); }, 200);

      // Modal morphs back to button rect
      anims.push(animate(modal, {
        left: `${btnRect.left}px`, top: `${btnRect.top}px`,
        width: `${btnRect.width}px`, height: `${btnRect.height}px`,
        borderRadius: `${btnRect.height / 2}px`,
        padding: "0px",
      }, {
        ...SPRING.default,
        onComplete: () => {
          const buttonContainer = buttonPillRef.current?.closest("[data-send-it-container]") as HTMLElement | null;
          const pill = buttonPillRef.current as HTMLElement | null;
          if (buttonContainer) buttonContainer.style.opacity = "1";

          // Instant swap: hide modal, show pill in same frame (no crossfade)
          modal.style.visibility = "hidden";
          if (pill) pill.style.opacity = "";

          // Hero fades — pill text takes over seamlessly
          animate(hero, { opacity: 0 }, { duration: 0.08 });

          setTimeout(() => close(), 300);
        },
      }));

      // ~200ms before morph settles: show container (for arrow) but hide pill
      // (hero + modal cover the text area, only the arrow extends beyond)
      delay(() => {
        const buttonContainer = buttonPillRef.current?.closest("[data-send-it-container]") as HTMLElement | null;
        const pill = buttonPillRef.current as HTMLElement | null;
        const arrowEl = buttonPillRef.current?.parentElement?.querySelector("[data-arrow-wrap]") as HTMLElement | null;

        if (buttonContainer) buttonContainer.style.opacity = "1";
        if (pill) pill.style.opacity = "0"; // hide text, hero covers it
        if (arrowEl) {
          arrowEl.style.visibility = "visible";
          animate(arrowEl, { x: [-16, 0], opacity: [0, 1] }, SPRING.default);
        }
      }, 390);
    }, 100);

    timersRef.current.push(closeTimer);
    animsRef.current.push(...anims);
  }, [close, stopAll]);

  const isReady = !closing && caption.trim().length > 0 && files.length > 0;

  // ─── Ready button reveal ───
  useEffect(() => {
    const transition = prefersReducedMotion ? INSTANT : SPRING.default;
    const baseHeight = modalBaseHeightRef.current;
    if (isReady) {
      track(animate(readyOpacity, 1, transition));
      track(animate(readyScaleX, 1, transition));
      track(animate(arrowOpacity, 1, transition));
      track(animate(arrowX, 0, transition));
      track(animate(rowHeight, 48, transition));
      track(animate(rowMarginTop, 0, transition));
      if (!isClosingRef.current && modalRef.current && baseHeight !== null) {
        track(animate(modalRef.current, { height: baseHeight + 72 }, transition));
      }
    } else {
      track(animate(readyOpacity, 0, transition));
      track(animate(readyScaleX, 0, transition));
      track(animate(arrowOpacity, 0, transition));
      track(animate(arrowX, -48, transition));
      track(animate(rowHeight, 0, transition));
      track(animate(rowMarginTop, -24, transition));
      if (!isClosingRef.current && modalRef.current && baseHeight !== null) {
        track(animate(modalRef.current, { height: baseHeight }, transition));
      }
    }
  }, [isReady, prefersReducedMotion, readyOpacity, readyScaleX, arrowOpacity, arrowX, rowHeight, rowMarginTop, track]);

  // Escape key → run full close animation (not context.close which skips it)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleClose]);

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Post an experiment"
      className="fixed inset-0 z-40"
      onPaste={handlePaste}
    >
      {/* Backdrop */}
      <CursorCollapseIcon onDismiss={handleClose}>
        <motion.div
          className="absolute inset-0 bg-[var(--page-bg)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: closing ? 0 : 0.96 }}
          transition={closing ? { duration: 0.2, ease: "easeOut" } : SPRING.default}
        />
      </CursorCollapseIcon>

      {/* Hero — just the text, no arrow (button has its own arrow circle) */}
      <div
        ref={heroRef}
        className="pointer-events-none flex h-12 items-center overflow-hidden"
        style={{ opacity: 0, position: "fixed", zIndex: 60 }}
      >
        <span className="font-heading text-base font-bold text-[var(--page-bg)] whitespace-nowrap">
          SEND IT
        </span>
      </div>

      {/* Modal */}
      <div
        ref={modalRef}
        className="z-50 flex flex-col gap-6 bg-[var(--modal-bg)]"
        style={{ visibility: "hidden" }}
      >
        {/* Marquee — GSAP horizontalLoop */}
        <div ref={marqueeRowRef} className="flex h-12 items-center overflow-hidden" style={{ opacity: 0 }}>
          {Array.from({ length: MARQUEE_COUNT }).map((_, i) => (
            <span key={i} data-marquee-item className="flex shrink-0 items-center gap-2 px-2">
              <span className="font-heading text-base font-bold text-[var(--page-bg)] whitespace-nowrap">
                SEND IT
              </span>
              <ArrowRight className="size-3 text-[var(--page-bg)]" />
            </span>
          ))}
        </div>

        <div ref={userRowRef} className="flex w-full items-center gap-2" style={{ opacity: 0 }}>
          <div className={`flex h-14 shrink-0 items-center justify-center ${INNER_RADIUS} px-4`} style={{ backgroundColor: userColor }}>
            <span className="text-heading-base text-[var(--page-bg)] whitespace-nowrap">@{userName}</span>
          </div>
          <div ref={captionRef} className="flex-1" style={{ opacity: 0, transformOrigin: "left center" }}>
            <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)}
              aria-label="Caption"
              placeholder="is designing the greatest thing since sliced bread."
              className={`h-14 w-full ${INNER_RADIUS} border border-[var(--modal-border)] bg-[var(--modal-surface)] px-4 text-heading-base text-[var(--page-bg)] placeholder:text-[var(--modal-placeholder)] outline-none focus-visible:border-[var(--profile-color,var(--border-subtle))] focus-visible:ring-3 focus-visible:ring-[var(--profile-color,var(--border-subtle))]/30`} />
          </div>
        </div>

        <div ref={uploadAreaRef} style={{ opacity: 0 }}>
          <div {...getRootProps({
              "aria-label": "Drop, paste, or click to upload images and video",
            })}
            className={`flex h-[240px] cursor-pointer flex-col items-center justify-center gap-3 ${INNER_RADIUS} border transition-colors ${
              isDragActive ? "border-[var(--page-bg)] bg-[var(--modal-active-bg)]" : "border-[var(--modal-border)] bg-[var(--modal-surface)]"}`}>
            <input {...getInputProps({ "aria-label": "Choose files to upload" })} />
            {files.length > 0 ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-heading-base text-[var(--modal-text-secondary)]">{files.length} file{files.length > 1 ? "s" : ""} selected</p>
                <p className="text-heading-base text-[var(--modal-placeholder)]">Drop more or click to add.</p>
              </div>
            ) : (
              <>
                <p className="text-heading-base text-[var(--modal-text-secondary)] text-center">Drag and drop your work. Or &#8984;V.</p>
                <p className="text-heading-base text-[var(--modal-placeholder)]">Max size 10MB.</p>
                <p className="text-heading-base text-[var(--modal-placeholder)]">png, jpg, gif, webp, webm, svg</p>
              </>
            )}
          </div>
        </div>

        <motion.div
          className="flex w-full shrink-0 items-center gap-0.5"
          style={{ height: rowHeight, marginTop: rowMarginTop, overflow: "hidden" }}
        >
          <motion.div
            className="flex-1"
            style={{
              transformOrigin: "left center",
              opacity: readyOpacity,
              scaleX: readyScaleX,
              pointerEvents: isReady ? "auto" : "none",
            }}
          >
            <motion.button onClick={handleSubmit} disabled={submitting}
              aria-busy={submitting}
              aria-label={submitting ? "Sending your post" : "Submit post"}
              className="flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-[var(--page-bg)] px-6"
              whileHover="hover"
              initial="idle"
            >
              <span className="inline-flex text-heading-base font-bold text-[var(--text-dark)] whitespace-nowrap">
                {(submitting ? "SENDING..." : "I'M READY").split("").map((char, i) => (
                  <motion.span
                    key={i}
                    className="inline-block"
                    variants={{
                      idle: { y: 0 },
                      hover: { y: -3 },
                    }}
                    transition={{
                      type: "spring",
                      mass: 1.2,
                      stiffness: 170,
                      damping: 16,
                      delay: i * 0.02,
                    }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </span>
            </motion.button>
          </motion.div>
          <motion.div
            style={{
              opacity: arrowOpacity,
              x: arrowX,
              pointerEvents: isReady ? "auto" : "none",
            }}
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-[var(--page-bg)]">
              <ArrowRight className="size-5 text-[var(--text-dark)]" />
            </span>
          </motion.div>
        </motion.div>

        {error && <p role="alert" className="font-heading text-sm text-red-400 text-center">{error}</p>}
      </div>
    </div>
  );
}
