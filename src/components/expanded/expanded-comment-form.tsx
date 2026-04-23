"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { XIcon } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useProfileColor } from "@/hooks/use-profile-color";
import { createClient } from "@/lib/supabase/client";
import { getAuthorColor } from "@/lib/utils";
import { SPRING } from "@/lib/motion";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  color: string | null;
}

interface ReplyTarget {
  id: string;
  authorName: string;
}

interface ExpandedCommentFormProps {
  onSubmit: (body: string, mentions?: string[]) => Promise<void>;
  replyingTo?: ReplyTarget | null;
  onCancelReply?: () => void;
}

const MENTION_SHADOW =
  "0px 7px 16px rgba(0,0,0,0.04), 0px 30px 30px rgba(0,0,0,0.03), 0px 67px 40px rgba(0,0,0,0.02), 0px 120px 48px rgba(0,0,0,0.01)";

export function ExpandedCommentForm({
  onSubmit,
  replyingTo,
  onCancelReply,
}: ExpandedCommentFormProps) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const mentionStartRef = useRef<number>(-1);
  const mentionIdsRef = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const { user } = useUser();
  // Prefetch all profiles on mount — small team, so load once and filter
  // client-side for instant autocomplete (no network per keystroke).
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, color")
      .then(({ data }) => {
        if (data) setAllProfiles(data as Profile[]);
      });
  }, []);

  const profileColor = useProfileColor();
  // Use the resolved profile color directly. Routing through getAuthorColor
  // here would fall back to the hash/KNOWN map (e.g. "kai" → #f84f11) whenever
  // the cache was cold, flashing the wrong color on focus.
  const userColor = profileColor ?? "var(--border-subtle)";

  // Client-side filter — instant, no debounce needed.
  const mentionResults = useMemo(() => {
    if (mentionQuery === null || mentionQuery.length === 0 || allProfiles.length === 0) return [];
    const q = mentionQuery.toLowerCase();
    return allProfiles
      .filter((p) => {
        // Exclude current user
        if (user && p.id === user.id) return false;
        return (
          p.full_name?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q)
        );
      })
      .slice(0, 5);
  }, [mentionQuery, allProfiles, user]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [mentionResults]);

  // Detect @mention context from input value + caret position
  const detectMention = useCallback((value: string, caretPos: number) => {
    // Scan backward from caret for an @ not preceded by a word character
    for (let i = caretPos - 1; i >= 0; i--) {
      const ch = value[i];
      if (ch === " " || ch === "\n") {
        // Hit whitespace before finding @ — no mention context
        setMentionQuery(null);
        return;
      }
      if (ch === "@") {
        // Found @. It should be at start of input or preceded by whitespace.
        if (i > 0 && value[i - 1] !== " " && value[i - 1] !== "\n") {
          setMentionQuery(null);
          return;
        }
        const query = value.slice(i + 1, caretPos);
        mentionStartRef.current = i;
        setMentionQuery(query);
        return;
      }
    }
    setMentionQuery(null);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBody(value);
    const caretPos = e.target.selectionStart ?? value.length;
    detectMention(value, caretPos);
  };

  const acceptMention = useCallback(
    (profile: Profile) => {
      const displayName =
        profile.full_name || profile.email?.split("@")[0] || "user";
      const start = mentionStartRef.current;
      const input = inputRef.current;
      const caretPos = input?.selectionStart ?? body.length;

      // Replace @query with @displayName + trailing space
      const before = body.slice(0, start);
      const after = body.slice(caretPos);
      const inserted = `@${displayName} `;
      const newBody = before + inserted + after;
      setBody(newBody);

      // Track the mention ID
      mentionIdsRef.current.add(profile.id);

      // Close popover
      setMentionQuery(null);

      // Restore focus and caret
      requestAnimationFrame(() => {
        if (input) {
          input.focus();
          const pos = before.length + inserted.length;
          input.setSelectionRange(pos, pos);
        }
      });
    },
    [body]
  );

  const popoverOpen =
    mentionQuery !== null && mentionQuery.length > 0 && mentionResults.length > 0;

  // Measure input wrapper position for portal-rendered popover
  useEffect(() => {
    if (!popoverOpen) {
      setPopoverPos(null);
      return;
    }
    const el = inputWrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPopoverPos({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }, [popoverOpen]);

  const handleSubmit = async () => {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    try {
      const mentions =
        mentionIdsRef.current.size > 0
          ? Array.from(mentionIdsRef.current)
          : undefined;
      await onSubmit(body.trim(), mentions);
      setBody("");
      mentionIdsRef.current = new Set();
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Mention popover keyboard navigation
    if (popoverOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % mentionResults.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(
          (i) => (i - 1 + mentionResults.length) % mentionResults.length
        );
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        acceptMention(mentionResults[activeIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setMentionQuery(null);
        return;
      }
    }

    // Default keyboard handling
    if (e.key === "Enter") {
      e.preventDefault();
      void handleSubmit();
    } else if (e.key === "Escape" && replyingTo) {
      e.preventDefault();
      e.stopPropagation();
      onCancelReply?.();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            className="flex items-center justify-between rounded-md bg-[color-mix(in_srgb,var(--text-dark)_4%,transparent)] px-3 py-1.5 text-xs text-[var(--text-caption)]"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            <span>
              Replying to{" "}
              <span className="font-bold text-[var(--text-dark)]">
                @{replyingTo.authorName.toLowerCase()}
              </span>
            </span>
            {onCancelReply && (
              <button
                type="button"
                onClick={onCancelReply}
                aria-label="Cancel reply"
                className="inline-flex items-center gap-1 text-[var(--text-caption)] hover:text-[var(--text-dark)]"
              >
                <XIcon className="size-3" aria-hidden="true" />
                Esc
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input wrapper */}
      <div ref={inputWrapperRef}>
        <motion.div
          className="flex h-14 items-center overflow-hidden rounded-lg border bg-[var(--page-bg)] px-4"
          animate={{ borderColor: focused ? userColor : "var(--border-subtle)" }}
          transition={SPRING.default}
          aria-busy={submitting}
        >
          <input
            ref={inputRef}
            type="text"
            value={body}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={
              replyingTo
                ? `Reply to @${replyingTo.authorName.toLowerCase()}…`
                : "@user to reply, or add to the conversation."
            }
            aria-label="Add a comment (Enter to send)"
            aria-keyshortcuts={replyingTo ? "Enter Escape" : "Enter"}
            aria-controls={popoverOpen ? "expanded-comment-mention-listbox" : undefined}
            aria-expanded={popoverOpen}
            aria-autocomplete="list"
            aria-activedescendant={
              popoverOpen ? `mention-${mentionResults[activeIndex]?.id}` : undefined
            }
            role="combobox"
            disabled={submitting}
            data-overlay-autofocus
            className="min-w-0 flex-1 bg-transparent text-heading-lg text-[var(--text-dark)] placeholder:text-[var(--text-caption)] focus:outline-none"
          />
          <AnimatePresence initial={false}>
            {body.length > 0 && (
              <motion.span
                key="send-helper"
                className="pointer-events-none shrink-0 text-heading-lg text-[var(--text-caption)] whitespace-nowrap"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                aria-hidden="true"
              >
                ⏎ to send
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

      </div>

      {/* Mention autofill popover — portaled to body to escape overflow clipping */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {popoverOpen && popoverPos && (
              <motion.div
                className="pointer-events-auto fixed z-[70] flex flex-col bg-white p-2 rounded-2xl"
                style={{
                  top: popoverPos.top,
                  left: popoverPos.left,
                  width: popoverPos.width,
                  boxShadow: MENTION_SHADOW,
                }}
                id="expanded-comment-mention-listbox"
                role="listbox"
                aria-label="Mention suggestions"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
              >
                {mentionResults.map((profile, i) => {
                  const name =
                    profile.full_name ||
                    profile.email?.split("@")[0] ||
                    "user";
                  const color = getAuthorColor(name, profile.color);
                  const isActive = i === activeIndex;

                  return (
                    <div
                      key={profile.id}
                      id={`mention-${profile.id}`}
                      role="option"
                      aria-selected={isActive}
                      className={`flex cursor-pointer items-center gap-3 p-2 rounded-lg transition-colors ${
                        isActive ? "bg-[var(--row-hover-bg)]" : ""
                      }`}
                      onMouseEnter={() => setActiveIndex(i)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        acceptMention(profile);
                      }}
                    >
                      <div
                        className="size-9 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-heading text-lg font-bold tracking-[-0.18px] text-[var(--text-dark)] whitespace-nowrap">
                        @{name.toLowerCase()}
                      </span>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
