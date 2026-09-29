import { catalog, mutateCatalog } from "@/lib/catalog";
import { apiError, jsonBody, requireAdmin, sameOrigin } from "@/lib/admin-auth";
export const runtime = "nodejs";
export async function GET() {
  try {
    await requireAdmin();
    return Response.json(await catalog(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await requireAdmin();
    return Response.json(await mutateCatalog(await jsonBody(request)));
  } catch (error) {
    return apiError(error);
  }
}
