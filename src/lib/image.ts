/**
 * Downscale and re-encode an image File in the browser so uploads stay small
 * and fast. Phone photos are often 5–10 MB — far larger than needed for
 * document verification, and large enough to fail upload size limits.
 *
 * Non-image files (e.g. PDFs) and already-small images are returned unchanged.
 * On any failure the original file is returned, so this never blocks an upload.
 */
export async function compressImage(
  file: File,
  maxDim = 1800,
  quality = 0.82,
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size < 800 * 1024) return file; // already small enough

  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob || blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "upload";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
