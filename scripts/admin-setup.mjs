import { createInterface } from "node:readline/promises";
import { randomBytes, scryptSync } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { Writable } from "node:stream";

let muted = false;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) process.stdout.write(chunk, encoding);
    callback();
  },
});
const terminal = createInterface({
  input: process.stdin,
  output,
  terminal: true,
});
try {
  const email = (await terminal.question("Admin email: ")).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email address.");
  process.stdout.write(
    "Admin password (at least 12 characters; input hidden): ",
  );
  muted = true;
  const password = await terminal.question("");
  muted = false;
  process.stdout.write("\n");
  if (password.length < 12) throw new Error("Use at least 12 characters.");
  process.stdout.write("Confirm password (input hidden): ");
  muted = true;
  const confirmation = await terminal.question("");
  muted = false;
  process.stdout.write("\n");
  if (confirmation !== password) throw new Error("Passwords did not match.");
  const salt = randomBytes(24).toString("hex");
  const hash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
  let previous = "";
  try {
    previous = await readFile(".env.local", "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const remaining = previous
    .split(/\r?\n/)
    .filter((line) => !/^(ADMIN_EMAIL|ADMIN_PASSWORD_HASH)=/.test(line))
    .join("\n")
    .trim();
  await writeFile(
    ".env.local",
    `${remaining}${remaining ? "\n" : ""}ADMIN_EMAIL=${email}\nADMIN_PASSWORD_HASH=${hash}\n`,
    { mode: 0o600 },
  );
  console.log(
    "Admin credentials saved to .env.local. Restart the app and open /admin. For hosting, copy these two environment settings into your hosting dashboard. No plaintext password was saved.",
  );
} catch (error) {
  muted = false;
  console.error(error.message);
  process.exitCode = 1;
} finally {
  terminal.close();
}
