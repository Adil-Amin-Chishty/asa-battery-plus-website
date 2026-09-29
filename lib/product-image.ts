import sharp from "sharp";

export async function prepareProductImage(bytes: Buffer) {
  const input = sharp(bytes, { limitInputPixels: 25000000 });
  const metadata = await input.metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format || ""))
    throw new Error("Invalid image format");
  const oriented = await input.rotate().ensureAlpha().png().toBuffer();
  const stats = await sharp(oriented).stats();
  if (stats.channels[3].max === 0)
    throw new Error("The photo is completely transparent. Try another photo.");
  const cutout = !stats.isOpaque;
  let image = sharp(oriented);
  if (cutout) image = image.trim({ background: "#00000000", threshold: 5 });
  const { data: resized, info } = await image
    .resize(1104, 1104, { fit: "inside", withoutEnlargement: true })
    .modulate({ brightness: 1.02 })
    .sharpen({ sigma: 0.5, m1: 0.4, m2: 1.2 })
    .png()
    .toBuffer({ resolveWithObject: true });
  // Keep padding proportional to the actual cutout. A small source placed on
  // a fixed 1200px canvas becomes a tiny thumbnail when displayed in a card.
  // Shrink the canvas instead of upscaling the battery and blurring its label.
  const canvasSize = Math.min(1200, Math.ceil(Math.max(info.width, info.height) / 0.92));
  return sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, gravity: "centre" }])
    .webp({ quality: 92, alphaQuality: 100, effort: 5 })
    .toBuffer();
}
