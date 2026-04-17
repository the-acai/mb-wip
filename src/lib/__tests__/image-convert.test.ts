import { afterEach, describe, expect, it, vi } from "vitest";

import { convertToWebp } from "@/lib/image-convert";

function createImageFile() {
  return new File(["image-bytes"], "photo.jpg", { type: "image/jpeg" });
}

describe("convertToWebp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("falls back to the original file when createImageBitmap fails", async () => {
    const file = createImageFile();

    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockRejectedValue(new Error("decode failed"))
    );

    await expect(convertToWebp(file)).resolves.toBe(file);
  });

  it("falls back to the original file when OffscreenCanvas is unavailable", async () => {
    const file = createImageFile();
    const close = vi.fn();

    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ width: 400, height: 200, close })
    );
    vi.stubGlobal("OffscreenCanvas", undefined);

    await expect(convertToWebp(file)).resolves.toBe(file);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
