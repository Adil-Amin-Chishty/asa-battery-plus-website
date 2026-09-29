import { database } from "@/lib/database";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id))
    return new Response("Not found", { status: 404 });
  const row = await (
    await database()
  )
    .prepare("SELECT content FROM images WHERE id=?")
    .get(id);
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.content as ArrayBuffer), {
    headers: {
      "Content-Type": "image/webp",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
