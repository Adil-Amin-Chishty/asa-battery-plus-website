import { catalog } from "@/lib/catalog";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(await catalog(true), {
    headers: { "Cache-Control": "no-store" },
  });
}
