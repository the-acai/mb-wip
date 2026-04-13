"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useUser } from "@/hooks/use-user";
import { getAuthorColor } from "@/lib/utils";

interface ExpandedCommentFormProps {
  onSubmit: (body: string) => Promise<void>;
}

export function ExpandedCommentForm({ onSubmit }: ExpandedCommentFormProps) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);

  const { user } = useUser();
  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const userColor = userName ? getAuthorColor(userName) : "#dfe0e0";

  const handleSubmit = async () => {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(body.trim());
      setBody("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      className="flex h-14 items-center overflow-hidden rounded-lg border bg-[var(--page-bg)] px-4"
      animate={{ borderColor: focused ? userColor : "#dfe0e0" }}
      transition={{ type: "spring", mass: 1.2, stiffness: 170, damping: 16 }}
      aria-busy={submitting}
    >
      <input
        type="text"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="@user to reply, or add to the conversation."
        aria-label="Add a comment (⌘+Enter to send)"
        aria-keyshortcuts="Meta+Enter Control+Enter"
        disabled={submitting}
        className="flex-1 bg-transparent font-heading text-lg leading-[1.28] tracking-[-0.18px] text-[var(--text-dark)] placeholder:text-[var(--text-caption)] focus:outline-none"
      />
    </motion.div>
  );
}
