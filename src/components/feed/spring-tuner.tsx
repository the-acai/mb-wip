"use client";

import { useState } from "react";

export interface SpringConfig {
  mass: number;
  stiffness: number;
  damping: number;
  y: number;
  z: number;
  scale: number;
  blur: number;
  withinRowMs: number;
  rowBreathMs: number;
}

export const DEFAULT_SPRING: SpringConfig = {
  mass: 2,
  stiffness: 100,
  damping: 16,
  y: 24,
  z: 80,
  scale: 1.06,
  blur: 0,
  withinRowMs: 80,
  rowBreathMs: 60,
};

interface SpringTunerProps {
  config: SpringConfig;
  onChange: (config: SpringConfig) => void;
  onReplay: () => void;
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

export function SpringTuner({ config, onChange, onReplay }: SpringTunerProps) {
  const [collapsed, setCollapsed] = useState(false);

  const set = (key: keyof SpringConfig, value: number) =>
    onChange({ ...config, [key]: value });

  const configString = `mass: ${config.mass}, stiffness: ${config.stiffness}, damping: ${config.damping}
y: ${config.y}, z: ${config.z}, scale: ${config.scale}, blur: ${config.blur}
stagger: ${config.withinRowMs}ms / ${config.rowBreathMs}ms breath`;

  return (
    <div className="fixed right-4 bottom-4 z-50 w-80 rounded-xl border border-neutral-700 bg-neutral-900 text-white shadow-2xl">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold">Spring Tuner</span>
        <span className="text-xs text-neutral-500">{collapsed ? "▲" : "▼"}</span>
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

          {/* Initial transform */}
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Initial Transform
            </div>
            <div className="flex flex-col gap-2">
              <Slider label="y (px)" value={config.y} min={0} max={100} step={2} onChange={(v) => set("y", v)} />
              <Slider label="z (px)" value={config.z} min={-200} max={200} step={5} onChange={(v) => set("z", v)} />
              <Slider label="scale" value={config.scale} min={0.8} max={1.3} step={0.01} onChange={(v) => set("scale", v)} />
              <Slider label="blur (px)" value={config.blur} min={0} max={10} step={0.5} onChange={(v) => set("blur", v)} />
            </div>
          </div>

          {/* Stagger */}
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Stagger Timing
            </div>
            <div className="flex flex-col gap-2">
              <Slider label="within row" value={config.withinRowMs} min={0} max={200} step={5} onChange={(v) => set("withinRowMs", v)} />
              <Slider label="row breath" value={config.rowBreathMs} min={0} max={200} step={5} onChange={(v) => set("rowBreathMs", v)} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onReplay}
              className="flex-1 rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold transition-colors hover:bg-orange-500"
            >
              ↻ Replay
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(configString)}
              className="rounded-lg bg-neutral-700 px-3 py-2 text-sm transition-colors hover:bg-neutral-600"
            >
              Copy
            </button>
            <button
              onClick={() => onChange(DEFAULT_SPRING)}
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
