import { describe, it, expect } from "vitest";
import { computeStaggerDelays } from "../stagger";

describe("computeStaggerDelays", () => {
  it("returns an empty array when count is 0", () => {
    expect(computeStaggerDelays(0, 80, 60)).toEqual([]);
  });

  it("starts the first card at delay 0", () => {
    expect(computeStaggerDelays(1, 80, 60)).toEqual([0]);
  });

  it("spaces siblings within the same row by withinRowMs (in seconds)", () => {
    const delays = computeStaggerDelays(3, 80, 60);
    expect(delays).toEqual([0, 0.08, 0.16]);
  });

  it("inserts a row breath after every 3rd card", () => {
    // After card #3, we cross a row boundary — so card #4 should be
    // (80 within-row * 3) + 60 row-breath = 300ms after card #1.
    const delays = computeStaggerDelays(4, 80, 60);
    expect(delays[3]).toBeCloseTo(0.3, 5);
  });

  it("monotonically increases", () => {
    const delays = computeStaggerDelays(12, 80, 60);
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThan(delays[i - 1]);
    }
  });

  it("respects custom timings", () => {
    // 100ms within row, 200ms breath. Card #4 = (100 * 3) + 200 = 500ms.
    const delays = computeStaggerDelays(4, 100, 200);
    expect(delays).toEqual([0, 0.1, 0.2, 0.5]);
  });
});
