import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";

const directory = "public/image-tools";
await mkdir(directory, { recursive: true });
for (const name of [
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.mjs",
]) {
  await copyFile(
    `node_modules/onnxruntime-web/dist/${name}`,
    `${directory}/${name}`,
  );
}
const path = `${directory}/u2netp.onnx`;
const checksum = "8e83ca70e441ab06c318d82300c84806";
const valid = (bytes) =>
  createHash("md5").update(bytes).digest("hex") === checksum;
let cached;
try {
  cached = await readFile(path);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (!cached || !valid(cached)) {
  console.log("Downloading background-removal model (about 5 MB)…");
  const response = await fetch(
    "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx",
    { signal: AbortSignal.timeout(120000) },
  );
  if (!response.ok)
    throw new Error(
      `Model download failed (${response.status}). Run npm run images:prepare again with internet access.`,
    );
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!valid(bytes))
    throw new Error("Background-removal model checksum mismatch.");
  await writeFile(path, bytes);
}
for (const name of ["ONNX-RUNTIME-LICENSE.txt", "U2NET-LICENSE.txt"])
  await copyFile(`third-party/${name}`, `${directory}/${name}`);
console.log("Background-removal assets ready.");
