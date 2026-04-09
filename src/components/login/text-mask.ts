/**
 * Renders card text as a white-on-black luminance mask for the holographic shader.
 * Waits for the Parabolica font to load before rendering.
 */
export async function generateTextMask(
  width: number,
  height: number,
  dpr: number = Math.min(window.devicePixelRatio, 2)
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // Wait for Parabolica font
  await document.fonts.ready;
  const fontLoaded = document.fonts.check("1em parabolica");
  const fontFamily = fontLoaded ? "parabolica" : "sans-serif";

  // Black background
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  // White text
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // "matchbox" logo text at top
  ctx.font = `900 28px ${fontFamily}`;
  ctx.fillText("matchbox", width / 2, 56);

  // "WORKS IN PROGRESS" centered
  ctx.font = `900 36px ${fontFamily}`;
  const centerY = height / 2;
  const lineHeight = 36 * 1.02;
  ctx.fillText("WORKS IN", width / 2, centerY - lineHeight * 0.5);
  ctx.fillText("PROGRESS", width / 2, centerY + lineHeight * 0.5);

  // "ACCESS" near bottom
  ctx.font = `900 36px ${fontFamily}`;
  ctx.fillText("ACCESS", width / 2, height - 100);

  // Chevron below ACCESS
  const chevronY = height - 65;
  const chevronX = width / 2;
  ctx.beginPath();
  ctx.moveTo(chevronX - 18, chevronY - 8);
  ctx.lineTo(chevronX, chevronY + 4);
  ctx.lineTo(chevronX + 18, chevronY - 8);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  return canvas;
}
