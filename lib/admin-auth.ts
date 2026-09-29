import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { database } from "./database";
import { InputError } from "./catalog";

export const sessionCookie = "asa_admin";
export const sessionOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 12,
};
function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
function credential() {
  return hash(`${process.env.ADMIN_EMAIL}:${process.env.ADMIN_PASSWORD_HASH}`);
}
export async function requireAdmin() {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (
    !token ||
    !(await (
      await database()
    )
      .prepare(
        "SELECT token FROM sessions WHERE token=? AND expires>? AND credential=?",
      )
      .get(hash(token), Date.now(), credential()))
  )
    throw new InputError("Please sign in.", 401);
}
export function sameOrigin(request: Request) {
  // Next's internal request URL may use the bind address (0.0.0.0) instead
  // of the hostname the browser opened. Host identifies that public request
  // destination; browsers cannot override it when issuing cross-origin fetches.
  const url = new URL(request.url);
  const host = request.headers.get("host") || url.host;
  const expected = process.env.APP_ORIGIN
    ? new URL(process.env.APP_ORIGIN).origin
    : `${url.protocol}//${host}`;
  if (request.headers.get("origin") !== expected)
    throw new InputError("Request origin is not allowed.", 403);
}
export async function boundedBody(request: Request, limit: number) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new InputError("Request is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new InputError("Request body is required.");
  const parts: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new InputError("Request is too large.", 413);
    }
    parts.push(value);
  }
  return Buffer.concat(parts);
}
export async function jsonBody(request: Request) {
  try {
    const value = JSON.parse((await boundedBody(request, 16000)).toString());
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof InputError) throw error;
    throw new InputError("Invalid request.");
  }
}
export async function signIn(email: unknown, password: unknown) {
  const configuredEmail = process.env.ADMIN_EMAIL;
  const stored = process.env.ADMIN_PASSWORD_HASH;
  if (!configuredEmail || !stored)
    throw new InputError(
      "Admin access is not configured. Run npm run admin:setup on the server first.",
      503,
    );
  const db = await database();
  const now = Date.now();
  // A database-backed account-wide limit also works across workers and restarts.
  await db.prepare("DELETE FROM login_limits WHERE resets<=?").run(now);
  const limit = await db
    .prepare(
      "INSERT INTO login_limits VALUES ('admin',1,?) ON CONFLICT(id) DO UPDATE SET attempts=attempts+1 RETURNING attempts",
    )
    .get(now + 900000);
  if (limit && Number(limit.attempts) > 10)
    throw new InputError(
      "Too many sign-in attempts. Please try again in 15 minutes.",
      429,
    );
  const [salt, encoded] = stored.split(":");
  if (!salt || !encoded || !/^[a-f0-9]{128}$/.test(encoded))
    throw new InputError("Admin credentials need to be configured again.", 503);
  const candidate = scryptSync(
    typeof password === "string" ? password : "",
    salt,
    64,
  );
  if (
    !timingSafeEqual(candidate, Buffer.from(encoded, "hex")) ||
    typeof email !== "string" ||
    email.toLowerCase().trim() !== configuredEmail.toLowerCase()
  )
    throw new InputError("Email or password is incorrect.", 401);
  await db.prepare("DELETE FROM login_limits WHERE id='admin'").run();
  await db
    .prepare("DELETE FROM sessions WHERE expires<=? OR credential<>?")
    .run(now, credential());
  const token = randomBytes(32).toString("hex");
  await db
    .prepare("INSERT INTO sessions VALUES (?,?,?)")
    .run(hash(token), now + sessionOptions.maxAge * 1000, credential());
  return token;
}
export async function signOut() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookie)?.value;
  if (token)
    await (
      await database()
    )
      .prepare("DELETE FROM sessions WHERE token=?")
      .run(hash(token));
  cookieStore.delete(sessionCookie);
}
export function apiError(error: unknown) {
  if (error instanceof InputError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error("Admin operation failed:", error);
  return Response.json(
    { error: "Unable to save or load the catalog. Please try again." },
    { status: 500 },
  );
}
