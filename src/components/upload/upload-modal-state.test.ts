import { describe, expect, it } from "vitest";
import { ErrorCode, type FileRejection } from "react-dropzone";

import {
  getUploadRejectionMessage,
  isUploadReady,
} from "@/components/upload/upload-modal-state";

function createRejection(code: string, message = "Rejected"): FileRejection {
  return {
    file: new File(["x"], "example.bin", { type: "application/octet-stream" }),
    errors: [{ code, message }],
  };
}

describe("isUploadReady", () => {
  it("returns false when caption and files are both missing", () => {
    expect(
      isUploadReady({ caption: "", fileCount: 0, submitting: false })
    ).toBe(false);
  });

  it("returns false when there is only a caption", () => {
    expect(
      isUploadReady({
        caption: "Working on the upload flow",
        fileCount: 0,
        submitting: false,
      })
    ).toBe(false);
  });

  it("returns false when there are files but no caption", () => {
    expect(
      isUploadReady({ caption: "", fileCount: 1, submitting: false })
    ).toBe(false);
  });

  it("returns false for whitespace-only captions", () => {
    expect(
      isUploadReady({ caption: "   ", fileCount: 1, submitting: false })
    ).toBe(false);
  });

  it("returns true only when caption and files are present", () => {
    expect(
      isUploadReady({
        caption: "Testing the ready-state reveal",
        fileCount: 2,
        submitting: false,
      })
    ).toBe(true);
  });

  it("returns false while submitting", () => {
    expect(
      isUploadReady({
        caption: "Testing the ready-state reveal",
        fileCount: 1,
        submitting: true,
      })
    ).toBe(false);
  });
});

describe("getUploadRejectionMessage", () => {
  it("maps invalid-type rejections to a readable message", () => {
    expect(
      getUploadRejectionMessage([createRejection(ErrorCode.FileInvalidType)])
    ).toContain("Supported");
  });

  it("maps oversize rejections to a readable message", () => {
    expect(
      getUploadRejectionMessage([createRejection(ErrorCode.FileTooLarge)])
    ).toContain("10MB");
  });
});
