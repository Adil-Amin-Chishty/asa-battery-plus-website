// U²-Net's documented RGB normalization, with channel-first tensor layout.
export function imageTensor(rgba: Uint8ClampedArray | Uint8Array) {
  const count = rgba.length / 4;
  let maximum = 1;
  for (let i = 0; i < rgba.length; i += 4)
    maximum = Math.max(maximum, rgba[i], rgba[i + 1], rgba[i + 2]);
  const result = new Float32Array(count * 3);
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];
  for (let i = 0; i < count; i++)
    for (let c = 0; c < 3; c++)
      result[c * count + i] = (rgba[i * 4 + c] / maximum - mean[c]) / std[c];
  return result;
}

export function maskPixels(prediction: Float32Array) {
  let low = Infinity,
    high = -Infinity;
  for (const value of prediction) {
    if (!Number.isFinite(value))
      throw new Error("The photo could not be separated from its background.");
    low = Math.min(low, value);
    high = Math.max(high, value);
  }
  if (high - low < 0.00001)
    throw new Error(
      "No clear subject found. Try a photo with more space around the battery.",
    );
  const rgba = new Uint8ClampedArray(prediction.length * 4);
  let foreground = 0;
  for (let i = 0; i < prediction.length; i++) {
    const alpha = Math.round(((prediction[i] - low) / (high - low)) * 255);
    if (alpha > 128) foreground++;
    rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = 255;
    rgba[i * 4 + 3] = alpha < 8 ? 0 : alpha > 247 ? 255 : alpha;
  }
  if (foreground < prediction.length * 0.005)
    throw new Error("No clear battery found. Try a closer photo.");
  return rgba;
}
