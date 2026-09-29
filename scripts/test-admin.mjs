import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const port = 3197;
const origin = `http://localhost:${port}`;
const password = randomBytes(24).toString("hex");
const salt = randomBytes(16).toString("hex");
const dbPath = resolve(`.test-storage/catalog-${Date.now()}.sqlite`);
const env = {
  ...process.env,
  ADMIN_EMAIL: "test@example.com",
  ADMIN_PASSWORD_HASH: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
  APP_ORIGIN: "",
  CATALOG_DB_PATH: dbPath,
  TURSO_DATABASE_URL: "",
  TURSO_AUTH_TOKEN: "",
  NETLIFY: "",
  VERCEL: "",
};
let server;
let logs = "";
let cookie = "";
async function start() {
  logs = "";
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "0.0.0.0",
      "-p",
      String(port),
    ],
    { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
  );
  server.stdout.on("data", (data) => (logs += data));
  server.stderr.on("data", (data) => (logs += data));
  for (let i = 0; i < 80; i++) {
    if (server.exitCode !== null) throw new Error(logs);
    try {
      const r = await fetch(`${origin}/api/catalog`);
      if (r.ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error(`Server did not start: ${logs}`);
}
async function stop() {
  if (server && server.exitCode === null) {
    const exited = new Promise((resolve) => server.once("exit", resolve));
    server.kill();
    await exited;
  }
}
async function api(
  path,
  { method = "GET", body, auth = true, from = origin, status = 200 } = {},
) {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: {
      Origin: from,
      ...(auth && cookie ? { Cookie: cookie } : {}),
      ...(body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  assert.equal(response.status, status, JSON.stringify(result));
  return { result, response };
}
const change = (body) => api("/api/admin/catalog", { method: "POST", body });
try {
  await start();
  for (const asset of [
    "u2netp.onnx",
    "ort-wasm-simd-threaded.wasm",
    "ort-wasm-simd-threaded.mjs",
  ]) {
    const response = await fetch(`${origin}/image-tools/${asset}`);
    assert.equal(
      response.status,
      200,
      `${asset} must be deployed for browser background removal`,
    );
    await response.arrayBuffer();
  }
  const initial = (await api("/api/catalog")).result;
  assert.equal(initial.products.length, 4);
  assert.equal(initial.brands.length, 3);
  await api("/api/admin/catalog", { auth: false, status: 401 });
  await api("/api/admin/catalog", {
    method: "POST",
    auth: false,
    body: { action: "deleteBrand", id: "osaka" },
    status: 401,
  });
  await api("/api/admin/session", {
    method: "POST",
    body: { email: env.ADMIN_EMAIL, password: "wrong" },
    status: 401,
  });
  const login = await api("/api/admin/session", {
    method: "POST",
    body: { email: env.ADMIN_EMAIL, password },
  });
  assert.match(login.response.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(login.response.headers.get("set-cookie"), /Secure/i);
  cookie = login.response.headers.get("set-cookie").split(";")[0];
  await api("/api/admin/catalog", {
    method: "POST",
    from: "https://evil.example",
    body: { action: "deleteBrand", id: "osaka" },
    status: 403,
  });
  const form = new FormData();
  form.set(
    "file",
    new Blob([await readFile("public/products/osaka.webp")], {
      type: "image/webp",
    }),
    "battery.webp",
  );
  const upload = (
    await api("/api/admin/upload", { method: "POST", body: form })
  ).result;
  const image = await fetch(`${origin}${upload.url}`);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get("content-type"), "image/webp");
  const optimized = await fetch(
    `${origin}/_next/image?url=${encodeURIComponent(upload.url)}&w=640&q=75`,
  );
  assert.equal(
    optimized.status,
    200,
    "Uploaded photos must also work through Next.js Image",
  );
  const bad = new FormData();
  bad.set(
    "file",
    new Blob(["<script>bad</script>"], { type: "image/png" }),
    "fake.png",
  );
  await api("/api/admin/upload", { method: "POST", body: bad, status: 400 });
  let current = (await change({ action: "saveBrand", name: "Test Brand" }))
    .result;
  const parent = current.brands.find((b) => b.name === "TEST BRAND");
  assert.ok(parent);
  assert.ok(
    !(await api("/api/catalog")).result.brands.some((b) => b.id === parent.id),
  );
  const product = {
    brandId: parent.id,
    model: "Test 90",
    batteryType: "Maintenance-free",
    price: 12000,
    capacityAh: 90,
    voltage: 12,
    warranty: "12 months",
    availability: "In stock",
    application: "Cars",
    image: upload.url,
    active: true,
  };
  current = (await change({ action: "saveProduct", product })).result;
  let saved = current.products.find((p) => p.model === "Test 90");
  assert.equal(saved.brand, "TEST BRAND");
  let publicData = (await api("/api/catalog")).result;
  assert.ok(publicData.brands.some((b) => b.id === parent.id));
  assert.equal(
    publicData.products.filter((p) => p.brandId === parent.id).length,
    1,
  );
  await api("/api/admin/catalog", {
    method: "POST",
    body: {
      action: "saveProduct",
      product: { ...product, brandId: "missing" },
    },
    status: 400,
  });
  await api("/api/admin/catalog", {
    method: "POST",
    body: { action: "saveProduct", product: { ...product, price: -1 } },
    status: 400,
  });
  await api("/api/admin/catalog", {
    method: "POST",
    body: { action: "saveProduct", product },
    status: 409,
  });
  await change({ action: "saveBrand", id: parent.id, name: "Renamed Brand" });
  current = (
    await change({
      action: "saveProduct",
      product: { ...saved, price: 14500, brandId: "osaka" },
    })
  ).result;
  saved = current.products.find((p) => p.id === saved.id);
  assert.equal(saved.brand, "OSAKA");
  assert.equal(saved.price, 14500);
  await api("/api/admin/catalog", {
    method: "POST",
    body: { action: "saveProduct", product: { ...saved, revision: 1 } },
    status: 409,
  });
  current = (
    await change({
      action: "saveProduct",
      product: { ...saved, active: false, brandId: parent.id },
    })
  ).result;
  saved = current.products.find((p) => p.id === saved.id);
  publicData = (await api("/api/catalog")).result;
  assert.ok(!publicData.products.some((p) => p.id === saved.id));
  assert.ok(!publicData.brands.some((b) => b.id === parent.id));
  await stop();
  await start();
  current = (await api("/api/admin/catalog")).result;
  assert.equal(current.products.find((p) => p.id === saved.id).price, 14500);
  assert.equal((await fetch(`${origin}${upload.url}`)).status, 200);
  current = (await change({ action: "deleteBrand", id: parent.id })).result;
  assert.ok(!current.products.some((p) => p.id === saved.id));
  await change({ action: "deleteProduct", id: "osaka-ht60l" });
  assert.ok(
    !(await api("/api/catalog")).result.brands.some((b) => b.id === "osaka"),
  );
  for (const b of current.brands)
    await change({ action: "deleteBrand", id: b.id });
  assert.deepEqual((await api("/api/catalog")).result, {
    brands: [],
    products: [],
  });
  await stop();
  await start();
  assert.deepEqual((await api("/api/catalog")).result, {
    brands: [],
    products: [],
  });
  const html = await (await fetch(origin)).text();
  assert.ok(!html.includes('class="brand-logo'));
  await api("/api/admin/session", { method: "DELETE" });
  await api("/api/admin/catalog", { status: 401 });
  for (let i = 0; i < 10; i++)
    await api("/api/admin/session", {
      method: "POST",
      body: { email: env.ADMIN_EMAIL, password: "wrong" },
      status: 401,
    });
  await api("/api/admin/session", {
    method: "POST",
    body: { email: env.ADMIN_EMAIL, password },
    status: 429,
  });
  console.log(
    "PASS: auth, CSRF, upload validation, image serving, CRUD, brand isolation, rename/reassign, empty/hidden brands, validation, edit conflicts, cascade delete, restart persistence, empty-catalog persistence, logout and login throttling.",
  );
} catch (error) {
  console.error(error);
  console.error(logs);
  process.exitCode = 1;
} finally {
  await stop();
  for (const suffix of ["", "-wal", "-shm"])
    await unlink(dbPath + suffix).catch(() => {});
}
