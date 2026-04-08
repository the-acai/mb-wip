"use client";

import { useState } from "react";

interface ExpandedCommentFormProps {
  onSubmit: (body: string) => Promise<void>;
}

export function ExpandedCommentForm({ onSubmit }: ExpandedCommentFormProps) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    <div
      className="flex h-14 items-center overflow-hidden rounded-lg border border-[#dfe0e0] bg-[var(--page-bg)] px-4"
    >
      <input
        type="text"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="@user to reply, or add to the conversation."
        disabled={submitting}
        className="flex-1 bg-transparent font-heading text-lg leading-[1.28] tracking-[-0.18px] text-[var(--text-dark)] placeholder:text-[var(--text-caption)] focus:outline-none"
      />
    </div>
  );
}
