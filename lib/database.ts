import {
  createClient,
  type Client,
  type InValue,
  type Transaction,
} from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { batteries } from "@/data/batteries";
import { brands } from "@/data/brands";

let ready: Promise<Client> | undefined;
async function initialize() {
  const remote = process.env.TURSO_DATABASE_URL;
  if (!remote && (process.env.NETLIFY || process.env.VERCEL))
    throw new Error(
      "Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN before deploying.",
    );
  // This file is runtime data, never a build artifact to trace into a deployment.
  const path = resolve(
    /* turbopackIgnore: true */ process.env.CATALOG_DB_PATH ||
      "storage/catalog.sqlite",
  );
  if (!remote) mkdirSync(dirname(path), { recursive: true });
  const client = createClient({
    url: remote || `file:${path.replace(/\\/g, "/")}`,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  await client.executeMultiple(`PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS brands (id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE);
    CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE, model TEXT NOT NULL COLLATE NOCASE, data TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, revision INTEGER NOT NULL DEFAULT 1, UNIQUE(brand_id, model));
    CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, content BLOB NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL, credential TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS login_limits (id TEXT PRIMARY KEY, attempts INTEGER NOT NULL, resets INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  const tx = await client.transaction("write");
  try {
    if (
      !(await tx.execute("SELECT value FROM settings WHERE key='seeded'")).rows
        .length
    ) {
      for (const name of brands)
        await tx.execute({
          sql: "INSERT INTO brands (id,name) VALUES (?,?)",
          args: [name.toLowerCase(), name],
        });
      for (const product of batteries)
        await tx.execute({
          sql: "INSERT INTO products (id,brand_id,model,data) VALUES (?,?,?,?)",
          args: [
            product.id,
            product.brand.toLowerCase(),
            product.model,
            JSON.stringify(product),
          ],
        });
      await tx.execute("INSERT INTO settings VALUES ('seeded','1')");
    }
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    client.close();
    throw error;
  } finally {
    tx.close();
  }
  return client;
}

// Each request gets its own transaction handle; the underlying client is reused.
export async function database() {
  ready ??= initialize().catch((error) => {
    ready = undefined;
    throw error;
  });
  const client = await ready;
  let tx: Transaction | undefined;
  return {
    async exec(command: "BEGIN IMMEDIATE" | "COMMIT" | "ROLLBACK") {
      if (command === "BEGIN IMMEDIATE") tx = await client.transaction("write");
      else if (tx) {
        try {
          if (command === "COMMIT") await tx.commit();
          else await tx.rollback();
        } finally {
          tx.close();
          tx = undefined;
        }
      }
    },
    prepare(sql: string) {
      const execute = (args: InValue[]) =>
        (tx || client).execute({ sql, args });
      return {
        async get(...args: InValue[]) {
          return (await execute(args)).rows[0];
        },
        async all(...args: InValue[]) {
          return (await execute(args)).rows;
        },
        async run(...args: InValue[]) {
          return { changes: (await execute(args)).rowsAffected };
        },
      };
    },
  };
}
