"use client";

import { useState, useCallback } from "react";
import { motion } from "motion/react";
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

const EXPANSION_SPRING = {
  type: "spring" as const,
  mass: 1.2,
  stiffness: 170,
  damping: 16,
};

// Interior element spring: same feel, constrained to ~400ms
const INTERIOR_SPRING = {
  type: "spring" as const,
  visualDuration: 0.4,
  bounce: 0.2,
};

const ROW_BREATH = 0.06; // 60ms, from DEFAULT_SPRING.rowBreathMs

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES: Record<string, string[]> = {
  "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
  "video/webm": [".webm"],
};

export function UploadModalOverlay() {
  const { close } = useUploadModal();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const [marqueeActive, setMarqueeActive] = useState(false);
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const userColor = userName ? getAuthorColor(userName) : "#dfe0e0";

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [...prev, ...accepted]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: true,
  });

  // Handle Cmd+V paste
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

      // Refresh the feed
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }, [submitting, files, user, caption, queryClient, close]);

  const marqueeText = (
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
      <CursorCollapseIcon onDismiss={close}>
        <motion.div
          className="absolute inset-0 bg-[var(--page-bg)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.96 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </CursorCollapseIcon>

      {/* Modal container — morphs from SEND IT button */}
      <motion.div
        layoutId="send-it"
        className="fixed left-1/2 top-1/2 z-50 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-8 overflow-hidden bg-[#0e1708] p-6"
        style={{ borderRadius: 40, width: 544 }}
        transition={{ layout: EXPANSION_SPRING }}
        onLayoutAnimationComplete={() => setMarqueeActive(true)}
      >
        {/* Marquee row */}
        <div className="flex items-center overflow-hidden">
          <div
            className="flex gap-0"
            style={marqueeActive ? {
              animation: "marquee-scroll 10s linear infinite",
            } : undefined}
          >
            {marqueeText}
            {marqueeActive && marqueeText}
          </div>
        </div>

        {/* @user tag + caption input */}
        <motion.div
          className="flex w-full items-center gap-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...INTERIOR_SPRING, delay: 0 }}
        >
          <div
            className="flex h-14 shrink-0 items-center justify-center rounded-lg px-4"
            style={{ backgroundColor: userColor }}
          >
            <span className="font-heading text-base leading-[1.28] tracking-[-0.16px] text-[#f7f8f8] whitespace-nowrap">
              @{userName}
            </span>
          </div>
          {/* Caption input — stagger 2b */}
          <motion.div
            className="flex-1"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ ...INTERIOR_SPRING, delay: ROW_BREATH }}
            style={{ transformOrigin: "left center" }}
          >
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="is designing the greatest thing since sliced bread."
              className="h-14 w-full rounded-lg border border-[#3d4141] bg-[#222520] px-4 font-heading text-base leading-[1.28] tracking-[-0.16px] text-[#f7f8f8] placeholder:text-[#8b8b8b] focus:outline-none"
            />
          </motion.div>
        </motion.div>

        {/* Upload area — stagger 2c */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...INTERIOR_SPRING, delay: ROW_BREATH * 2 }}
        >
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
        </motion.div>

        {/* I'M READY button — two-phase animation */}
        <div className="flex w-full items-center gap-0.5">
          {/* Container scales in on X — stagger 2dI */}
          <motion.div
            className="flex-1"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ ...INTERIOR_SPRING, delay: ROW_BREATH * 3 }}
            style={{ transformOrigin: "left center" }}
          >
            <button
              onClick={handleSubmit}
              disabled={submitting || files.length === 0}
              className="flex h-12 w-full items-center justify-center rounded-full bg-[#f7f8f8] px-6 disabled:opacity-50"
            >
              <span className="font-heading text-base font-bold leading-[1.28] tracking-[-0.16px] text-[#0e1708] whitespace-nowrap">
                {submitting ? "SENDING..." : "I'M READY"}
              </span>
            </button>
          </motion.div>

          {/* Arrow slides in from beneath — stagger 2dII */}
          <motion.div
            initial={{ x: -48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ ...INTERIOR_SPRING, delay: ROW_BREATH * 4 }}
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-[#f7f8f8]">
              <ArrowRight className="size-5 text-[#0e1708]" />
            </span>
          </motion.div>
        </div>

        {/* Error message */}
        {error && (
          <p className="font-heading text-sm text-red-400 text-center">{error}</p>
        )}
      </motion.div>
    </motion.div>
  );
}
