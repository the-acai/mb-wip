"use client";

interface ThreadLineProps {
  colorTop: string;
  colorBottom: string;
}

export function ThreadLine({ colorTop, colorBottom }: ThreadLineProps) {
  return (
    <div
      className="absolute left-[18px] top-[48px] w-0.5"
      style={{
        height: "calc(100% - 16px)",
        background: `linear-gradient(in oklch, ${colorTop}, ${colorBottom})`,
      }}
    />
  );
}
