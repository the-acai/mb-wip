import { afterEach, describe, expect, it, vi } from "vitest";

import { extractPlaceholderData } from "@/lib/thumb-hash";

function createImageFile() {
  return new File(["image-bytes"], "photo.jpg", { type: "image/jpeg" });
}

describe("extractPlaceholderData", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns null when createImageBitmap fails", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockRejectedValue(new Error("decode failed"))
    );

    await expect(extractPlaceholderData(createImageFile())).resolves.toBeNull();
  });

  it("returns null when OffscreenCanvas is unavailable", async () => {
    const close = vi.fn();

    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ width: 400, height: 200, close })
    );
    vi.stubGlobal("OffscreenCanvas", undefined);

    await expect(extractPlaceholderData(createImageFile())).resolves.toBeNull();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
