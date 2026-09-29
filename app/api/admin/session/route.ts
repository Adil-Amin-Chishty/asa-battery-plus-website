import { cookies } from "next/headers";
import {
  apiError,
  jsonBody,
  sameOrigin,
  sessionCookie,
  sessionOptions,
  signIn,
  signOut,
} from "@/lib/admin-auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await jsonBody(request);
    const token = await signIn(body.email, body.password);
    (await cookies()).set(sessionCookie, token, sessionOptions);
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    await signOut();
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
