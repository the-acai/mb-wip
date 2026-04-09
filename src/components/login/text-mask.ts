/**
 * Renders card text + matchbox logo as a white-on-black luminance mask
 * for the holographic shader.
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

  // Black background
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  // --- Matchbox logo SVG (rendered white) ---
  try {
    const logoImg = await loadImage("/matchbox-logo.svg");
    // SVG is 320×47, scale to fit ~280px wide, centered near top
    const logoTargetW = 280;
    const logoScale = logoTargetW / logoImg.naturalWidth;
    const logoW = logoTargetW;
    const logoH = logoImg.naturalHeight * logoScale;
    const logoX = (width - logoW) / 2;
    const logoY = 40;

    // Draw the black SVG, then invert to white using composite
    ctx.save();
    // First fill a white rect in the logo area
    ctx.fillStyle = "#fff";
    ctx.fillRect(logoX, logoY, logoW, logoH);
    // Then draw the black logo with destination-in to mask
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
    ctx.restore();
    // Reset composite mode
    ctx.globalCompositeOperation = "source-over";
  } catch {
    // Fallback: render "matchbox" as text
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 28px ${fontFamily}`;
    ctx.fillText("matchbox", width / 2, 56);
  }

  // White text
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

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
