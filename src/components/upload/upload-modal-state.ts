import { ErrorCode, type FileRejection } from "react-dropzone";

export function isUploadReady(options: {
  caption: string;
  fileCount: number;
  submitting: boolean;
}) {
  return (
    !options.submitting &&
    options.fileCount > 0 &&
    options.caption.trim().length > 0
  );
}

export function getUploadRejectionMessage(
  fileRejections: readonly FileRejection[]
) {
  for (const rejection of fileRejections) {
    for (const error of rejection.errors) {
      switch (error.code) {
        case ErrorCode.FileInvalidType:
          return "Supported files: png, jpg, gif, webp, webm, svg.";
        case ErrorCode.FileTooLarge:
          return "Files must be 10MB or smaller.";
        case ErrorCode.FileTooSmall:
          return "That file is too small to upload.";
        case ErrorCode.TooManyFiles:
          return "Too many files selected at once.";
        default:
          break;
      }
    }
  }

  return null;
}
