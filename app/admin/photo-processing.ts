export function removePhotoBackground(
  file: File,
  onProgress: (message: string) => void,
  signal: AbortSignal,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./background.worker.ts", import.meta.url),
      { type: "module" },
    );
    const finish = (error?: Error, blob?: Blob) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
      worker.terminate();
      if (error) reject(error);
      else resolve(blob!);
    };
    const cancel = () =>
      finish(
        new Error(
          "Photo processing cancelled. Your saved photo has not changed.",
        ),
      );
    const timer = setTimeout(
      () =>
        finish(
          new Error(
            "Background removal took too long. Try a smaller photo or keep the original.",
          ),
        ),
      120000,
    );
    signal.addEventListener("abort", cancel, { once: true });
    worker.onmessage = (
      event: MessageEvent<{ type: string; message?: string; blob?: Blob }>,
    ) => {
      if (event.data.type === "progress")
        onProgress(event.data.message || "Processing photo…");
      else if (event.data.type === "complete")
        finish(undefined, event.data.blob);
      else
        finish(new Error(event.data.message || "Background removal failed."));
    };
    worker.onerror = () =>
      finish(
        new Error(
          "Background remover could not load. Try again, or choose Keep original.",
        ),
      );
    if (signal.aborted) cancel();
    else worker.postMessage({ file });
  });
}
