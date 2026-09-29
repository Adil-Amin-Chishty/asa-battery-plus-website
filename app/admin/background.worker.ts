import * as ort from "onnxruntime-web/wasm";
import { imageTensor, maskPixels } from "@/lib/image-mask";

let session: Promise<ort.InferenceSession> | undefined;
const progress = (message: string) =>
  self.postMessage({ type: "progress", message });
self.onmessage = async (event: MessageEvent<{ file: File }>) => {
  let bitmap: ImageBitmap | undefined;
  try {
    progress("Reading photo…");
    bitmap = await createImageBitmap(event.data.file, {
      imageOrientation: "from-image",
    });
    if (bitmap.width * bitmap.height > 25000000)
      throw new Error("Choose a photo under 25 megapixels.");
    const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * ratio));
    const height = Math.max(1, Math.round(bitmap.height * ratio));
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx)
      throw new Error("Image processing is not supported by this browser.");
    ctx.drawImage(bitmap, 0, 0, width, height);
    const original = ctx.getImageData(0, 0, width, height);
    let transparent = 0;
    for (let i = 3; i < original.data.length; i += 4)
      if (original.data[i] < 16) transparent++;
    if (transparent < width * height * 0.01) {
      progress("Loading background remover… First use may take a moment.");
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.wasmPaths = new URL(
        "/image-tools/",
        self.location.origin,
      ).href;
      session ??= ort.InferenceSession.create(
        new URL("/image-tools/u2netp.onnx", self.location.origin).href,
        { executionProviders: ["wasm"] },
      ).catch((error) => {
        session = undefined;
        throw error;
      });
      const model = await session;
      const small = new OffscreenCanvas(320, 320);
      const smallContext = small.getContext("2d")!;
      smallContext.drawImage(canvas, 0, 0, 320, 320);
      progress("Removing background…");
      const output = await model.run({
        [model.inputNames[0]]: new ort.Tensor(
          "float32",
          imageTensor(smallContext.getImageData(0, 0, 320, 320).data),
          [1, 3, 320, 320],
        ),
      });
      const mask = maskPixels(
        output[model.outputNames[0]].data as Float32Array,
      );
      smallContext.putImageData(new ImageData(mask, 320, 320), 0, 0);
      ctx.globalCompositeOperation = "destination-in";
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(small, 0, 0, width, height);
    }
    progress("Preparing transparent photo…");
    const blob = await canvas.convertToBlob({ type: "image/png" });
    self.postMessage({ type: "complete", blob });
  } catch (error) {
    self.postMessage({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "Background removal failed. Try another photo.",
    });
  } finally {
    bitmap?.close();
  }
};
