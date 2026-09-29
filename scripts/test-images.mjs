import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import * as ort from "onnxruntime-web/wasm";
import { imageTensor, maskPixels } from "../lib/image-mask.ts";
import { prepareProductImage } from "../lib/product-image.ts";

ort.env.wasm.numThreads = 1;
const session = await ort.InferenceSession.create(
  new Uint8Array(await readFile("public/image-tools/u2netp.onnx")),
  { executionProviders: ["wasm"] },
);
try {
  await mkdir(".test-storage", { recursive: true });
  const source = await readFile("public/products/osaka.webp");
  const rgba = await sharp(source)
    .resize(320, 320, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer();
  const output = await session.run({
    [session.inputNames[0]]: new ort.Tensor(
      "float32",
      imageTensor(rgba),
      [1, 3, 320, 320],
    ),
  });
  const mask = maskPixels(output[session.outputNames[0]].data);
  const { width, height } = await sharp(source).metadata();
  const maskImage = await sharp(Buffer.from(mask), {
    raw: { width: 320, height: 320, channels: 4 },
  })
    .resize(width, height)
    .png()
    .toBuffer();
  const cutout = await sharp(source)
    .ensureAlpha()
    .composite([{ input: maskImage, blend: "dest-in" }])
    .png()
    .toBuffer();
  const result = await prepareProductImage(cutout);
  await writeFile(".test-storage/battery-transparent.webp", result);
  const metadata = await sharp(result).metadata();
  const stats = await sharp(result).stats();
  assert.equal(metadata.width, metadata.height);
  assert.ok(metadata.width <= 1200);
  assert.equal(metadata.hasAlpha, true);
  assert.equal(stats.channels[3].min, 0);
  assert.equal(stats.channels[3].max, 255);
  assert.ok(
    stats.channels[3].mean > 5 && stats.channels[3].mean < 240,
    "Must contain both a visible battery and transparent background",
  );
  assert.ok(result.length < 1500000);
  // Regression: a small battery must fill the frame, even when its original
  // image has a large transparent border. Native label pixels stay unscaled.
  const smallBattery = await sharp({ create: { width: 140, height: 180, channels: 4, background: "#cf202a" } }).png().toBuffer();
  const padded = await sharp({ create: { width: 800, height: 800, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: smallBattery, gravity: "centre" }]).png().toBuffer();
  const framed = await prepareProductImage(padded);
  const frame = await sharp(framed).metadata();
  const bounds = await sharp(framed).trim({ background: "#00000000", threshold: 5 }).toBuffer({ resolveWithObject: true });
  assert.ok(frame.width <= 200, "Small sources must not be padded to 1200px");
  assert.ok(Math.max(bounds.info.width, bounds.info.height) / frame.width > 0.89, "Battery must fill at least 89% of the frame's longest edge");
  assert.ok(bounds.info.height <= 182, "Small source should not be upscaled");
  assert.throws(() => maskPixels(new Float32Array(100)), /No clear subject/);
  assert.throws(
    () => maskPixels(new Float32Array([NaN, 1])),
    /could not be separated/,
  );
  const blank = await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();
  await assert.rejects(
    () => prepareProductImage(blank),
    /completely transparent/,
  );
  await assert.rejects(() => prepareProductImage(Buffer.from("not a photo")));
  console.log(
    `PASS: real WASM model inference, foreground mask, transparent WebP, framing, image validation. Output ${Math.round(result.length / 1024)} KB.`,
  );
} finally {
  await session.release();
}
