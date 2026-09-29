import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { createClient } from "@libsql/client";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.TURSO_DATABASE_URL;
if (!url || !/^(libsql|https):\/\//.test(url) || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local first. Do not put credentials in command arguments.");
}
const source = new DatabaseSync(resolve(process.env.CATALOG_DB_PATH || "storage/catalog.sqlite"), { readOnly: true });
const target = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
const tables = ["brands", "products", "images", "settings"];
const digest = value => createHash("sha256").update(JSON.stringify(value, (_key, entry) => entry instanceof Uint8Array || entry instanceof ArrayBuffer ? Buffer.from(entry instanceof ArrayBuffer ? new Uint8Array(entry) : entry).toString("base64") : entry)).digest("hex");
let tx;
try {
  // Read a consistent snapshot without changing the development database.
  source.exec("BEGIN");
  const snapshot = tables.map(name => ({
    name,
    schema: source.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(name)?.sql,
    rows: source.prepare(`SELECT * FROM ${name} ORDER BY 1`).all(),
  }));
  source.exec("COMMIT");
  if (snapshot.some(table => !table.schema)) throw new Error("Local catalog schema is incomplete.");
  tx = await target.transaction("write");
  for (const table of snapshot) await tx.execute(table.schema.replace(/^CREATE TABLE /i, "CREATE TABLE IF NOT EXISTS "));
  let existing = 0;
  for (const table of snapshot) existing += Number((await tx.execute(`SELECT COUNT(*) AS count FROM ${table.name}`)).rows[0].count);
  if (existing) {
    const matches = await Promise.all(snapshot.map(async table => digest((await tx.execute(`SELECT * FROM ${table.name} ORDER BY 1`)).rows.map(row => Object.fromEntries(Object.keys(table.rows[0] || row).map(key => [key, row[key]])))) === digest(table.rows)));
    if (matches.every(Boolean)) { await tx.rollback(); console.log("Hosted catalog already matches the local catalog. Nothing changed."); }
    else throw new Error("Hosted database already contains different data. Migration stopped without overwriting anything. Use a new empty database for the initial transfer.");
  } else {
    for (const table of snapshot) {
      for (const row of table.rows) {
        const columns = Object.keys(row);
        await tx.execute({ sql: `INSERT INTO ${table.name} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`, args: columns.map(column => row[column]) });
      }
      const result = await tx.execute(`SELECT COUNT(*) AS count FROM ${table.name}`);
      if (Number(result.rows[0].count) !== table.rows.length) throw new Error(`Verification failed for ${table.name}.`);
    }
    await tx.commit();
    console.log("Catalog transferred successfully:", snapshot.map(t => `${t.rows.length} ${t.name}`).join(", "));
    console.log("Local data is unchanged. Admin sessions and failed-login records were not transferred.");
  }
} catch (error) {
  if (tx && !tx.closed) await tx.rollback();
  // Avoid printing URLs, auth headers or raw SDK errors containing secrets.
  if (/Hosted database|Verification failed|Local catalog/.test(error.message)) console.error(error.message);
  else console.error("Migration failed. Check the database URL/token and connectivity. No partial catalog transfer was committed.");
  process.exitCode = 1;
} finally { tx?.close(); target.close(); source.close(); }
