/**
 * Renders card text + matchbox logo as a white-on-black luminance mask
 * for the holographic shader. All sizes are proportional to card dimensions.
 */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

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

  // Scale factor relative to the original 432px design width
  const s = width / 432;

  // Black background
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  // --- Matchbox logo SVG (rendered white) ---
  try {
    const logoImg = await loadImage("/matchbox-logo.svg");
    const logoTargetW = 280 * s;
    const logoScale = logoTargetW / logoImg.naturalWidth;
    const logoW = logoTargetW;
    const logoH = logoImg.naturalHeight * logoScale;
    const logoX = (width - logoW) / 2;
    const logoY = 40 * s;

    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.fillRect(logoX, logoY, logoW, logoH);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
  } catch {
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${28 * s}px ${fontFamily}`;
    ctx.fillText("matchbox", width / 2, 56 * s);
  }

  // White text
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // "WORKS IN PROGRESS" centered
  const fontSize = 36 * s;
  ctx.font = `900 ${fontSize}px ${fontFamily}`;
  const centerY = height / 2;
  const lineHeight = fontSize * 1.02;
  ctx.fillText("WORKS IN", width / 2, centerY - lineHeight * 0.5);
  ctx.fillText("PROGRESS", width / 2, centerY + lineHeight * 0.5);

  // "ACCESS" near bottom
  ctx.font = `900 ${fontSize}px ${fontFamily}`;
  ctx.fillText("ACCESS", width / 2, height - 100 * s);

  // Chevron below ACCESS
  const chevronY = height - 65 * s;
  const chevronX = width / 2;
  const chevronSize = 18 * s;
  ctx.beginPath();
  ctx.moveTo(chevronX - chevronSize, chevronY - 8 * s);
  ctx.lineTo(chevronX, chevronY + 4 * s);
  ctx.lineTo(chevronX + chevronSize, chevronY - 8 * s);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3 * s;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  return canvas;
}
