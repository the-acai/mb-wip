"use client";

import { useState } from "react";

export interface HoverSpringConfig {
  mass: number;
  stiffness: number;
  damping: number;
  letterY: number;
  staggerMs: number;
  paddingExpand: number;
}

export const DEFAULT_HOVER_SPRING: HoverSpringConfig = {
  mass: 2,
  stiffness: 100,
  damping: 16,
  letterY: 3,
  staggerMs: 40,
  paddingExpand: 8,
};

interface SpringTunerProps {
  config: HoverSpringConfig;
  onChange: (config: HoverSpringConfig) => void;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-24 shrink-0 text-xs text-neutral-400">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1 flex-1 cursor-pointer appearance-none rounded bg-neutral-700 accent-orange-500"
      />
      <span className="w-12 text-right font-mono text-xs text-neutral-300">
        {value}
      </span>
    </div>
  );
}

export function SpringTuner({ config, onChange }: SpringTunerProps) {
  const [collapsed, setCollapsed] = useState(false);

  const set = (key: keyof HoverSpringConfig, value: number) =>
    onChange({ ...config, [key]: value });

  const configString = `mass: ${config.mass}, stiffness: ${config.stiffness}, damping: ${config.damping}
letterY: ${config.letterY}, stagger: ${config.staggerMs}ms, padding: +${config.paddingExpand}px`;

  return (
    <div className="fixed right-4 bottom-4 z-50 w-80 rounded-xl border border-neutral-700 bg-neutral-900 text-white shadow-2xl">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold">Hover Spring Tuner</span>
        <span className="text-xs text-neutral-500">{collapsed ? "+" : "-"}</span>
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-4 border-t border-neutral-700 px-4 pt-3 pb-4">
          {/* Spring physics */}
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Spring Physics
            </div>
            <div className="flex flex-col gap-2">
              <Slider label="mass" value={config.mass} min={0.1} max={5} step={0.1} onChange={(v) => set("mass", v)} />
              <Slider label="stiffness" value={config.stiffness} min={10} max={500} step={5} onChange={(v) => set("stiffness", v)} />
              <Slider label="damping" value={config.damping} min={1} max={50} step={1} onChange={(v) => set("damping", v)} />
            </div>
          </div>

          {/* Hover effect */}
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Hover Effect
            </div>
            <div className="flex flex-col gap-2">
              <Slider label="letter Y (px)" value={config.letterY} min={0} max={12} step={0.5} onChange={(v) => set("letterY", v)} />
              <Slider label="stagger (ms)" value={config.staggerMs} min={0} max={120} step={5} onChange={(v) => set("staggerMs", v)} />
              <Slider label="pad expand" value={config.paddingExpand} min={0} max={24} step={1} onChange={(v) => set("paddingExpand", v)} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(configString)}
              className="flex-1 rounded-lg bg-neutral-700 px-3 py-2 text-sm transition-colors hover:bg-neutral-600"
            >
              Copy
            </button>
            <button
              onClick={() => onChange(DEFAULT_HOVER_SPRING)}
              className="rounded-lg bg-neutral-700 px-3 py-2 text-sm transition-colors hover:bg-neutral-600"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
