"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { XIcon } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { getAuthorColor } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
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
  const [mentionResults, setMentionResults] = useState<Profile[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const mentionStartRef = useRef<number>(-1);
  const mentionIdsRef = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const { user } = useUser();
  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const userColor = userName ? getAuthorColor(userName) : "#dfe0e0";

  // Debounced fetch for mention suggestions
  useEffect(() => {
    if (mentionQuery === null || mentionQuery.length === 0) {
      setMentionResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/mentions/search?q=${encodeURIComponent(mentionQuery)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          setMentionResults(data);
          setActiveIndex(0);
        }
      } catch {
        // best-effort
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [mentionQuery]);

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
      setMentionResults([]);

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
        setMentionResults([]);
        return;
      }
    }

    // Default keyboard handling
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
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

      {/* Input + mention popover wrapper */}
      <div className="relative">
        <motion.div
          className="flex h-14 items-center overflow-hidden rounded-lg border bg-[var(--page-bg)] px-4"
          animate={{ borderColor: focused ? userColor : "#dfe0e0" }}
          transition={{ type: "spring", mass: 1.2, stiffness: 170, damping: 16 }}
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
            aria-label="Add a comment (⌘+Enter to send)"
            aria-keyshortcuts="Meta+Enter Control+Enter"
            aria-expanded={popoverOpen}
            aria-autocomplete="list"
            aria-activedescendant={
              popoverOpen ? `mention-${mentionResults[activeIndex]?.id}` : undefined
            }
            role="combobox"
            disabled={submitting}
            data-overlay-autofocus
            className="flex-1 bg-transparent font-heading text-lg leading-[1.28] tracking-[-0.18px] text-[var(--text-dark)] placeholder:text-[var(--text-caption)] focus:outline-none"
          />
        </motion.div>

        {/* Mention autofill popover */}
        <AnimatePresence>
          {popoverOpen && (
            <motion.div
              className="absolute left-0 right-0 z-50 mt-2 flex flex-col bg-white p-2 rounded-2xl"
              style={{ boxShadow: MENTION_SHADOW }}
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
                const color = getAuthorColor(name);
                const isActive = i === activeIndex;

                return (
                  <div
                    key={profile.id}
                    id={`mention-${profile.id}`}
                    role="option"
                    aria-selected={isActive}
                    className={`flex cursor-pointer items-center gap-3 p-2 rounded-lg transition-colors ${
                      isActive ? "bg-[#eceded]" : ""
                    }`}
                    onMouseEnter={() => setActiveIndex(i)}
                    onMouseDown={(e) => {
                      // mouseDown (not click) so it fires before input blur
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
        </AnimatePresence>
      </div>
    </div>
  );
}
