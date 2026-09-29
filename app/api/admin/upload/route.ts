import { randomUUID } from "node:crypto";
import { prepareProductImage } from "@/lib/product-image";
import { database } from "@/lib/database";
import { InputError } from "@/lib/catalog";
import {
  apiError,
  boundedBody,
  requireAdmin,
  sameOrigin,
} from "@/lib/admin-auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await requireAdmin();
    const bytes = await boundedBody(request, 5 * 1024 * 1024 + 16000);
    const form = await new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": request.headers.get("content-type") || "" },
    }).formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      throw new InputError(
        "Choose a JPG, PNG or WebP photo smaller than 5 MB.",
      );
    let content: Buffer;
    try {
      content = await prepareProductImage(
        Buffer.from(await file.arrayBuffer()),
      );
    } catch {
      throw new InputError(
        "This photo cannot be read. Choose a valid JPG, PNG or WebP image under 25 megapixels.",
      );
    }
    if (content.length > 1500000)
      throw new InputError("This photo is too detailed. Try a smaller photo.");
    const db = await database();
    // Retain recent unused uploads for 24 hours so an open editor can still save them.
    await db
      .prepare(
        "DELETE FROM images WHERE created<? AND NOT EXISTS (SELECT 1 FROM products WHERE json_extract(data,'$.image')='/api/media/' || images.id)",
      )
      .run(Date.now() - 86400000);
    const id = randomUUID();
    await db
      .prepare("INSERT INTO images VALUES (?,?,?)")
      .run(id, content, Date.now());
    return Response.json({ url: `/api/media/${id}` });
  } catch (error) {
    return apiError(error);
  }
}
