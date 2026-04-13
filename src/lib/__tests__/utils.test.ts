import { describe, it, expect } from "vitest";
import { getAuthorColor } from "@/lib/utils";

describe("getAuthorColor", () => {
  it("is deterministic for the same name", () => {
    const a = getAuthorColor("alice");
    const b = getAuthorColor("alice");
    expect(a).toBe(b);
  });

  it("ignores leading @ and case in the lookup", () => {
    expect(getAuthorColor("@Alice")).toBe(getAuthorColor("alice"));
    expect(getAuthorColor("ALICE")).toBe(getAuthorColor("alice"));
  });

  it("respects the known-author overrides", () => {
    expect(getAuthorColor("kai")).toBe("#f84f11");
    expect(getAuthorColor("@Kai")).toBe("#f84f11");
    expect(getAuthorColor("brandon")).toBe("#9011f8");
  });

  it("falls back to a color from the AUTHOR_COLORS palette for unknown names", () => {
    const palette = new Set([
      "#f84f11",
      "#9011f8",
      "#11a8f8",
      "#f811a8",
      "#11f84f",
      "#f8c811",
    ]);
    for (const name of ["zoe", "bob", "carol", "dave", "eve"]) {
      expect(palette.has(getAuthorColor(name))).toBe(true);
    }
  });

  it("returns a string for empty input rather than throwing", () => {
    expect(typeof getAuthorColor("")).toBe("string");
  });
});
