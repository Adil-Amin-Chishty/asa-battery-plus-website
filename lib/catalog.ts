import { randomUUID } from "node:crypto";
import { database } from "./database";
import type { Catalog, CatalogBrand, CatalogProduct } from "./catalog-types";

export class InputError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function catalog(publicOnly = false): Promise<Catalog> {
  const db = await database();
  const products = (
    await db
      .prepare(
        `SELECT p.*, b.name AS brand FROM products p JOIN brands b ON b.id=p.brand_id ${publicOnly ? "WHERE p.active=1" : ""} ORDER BY b.name, p.model`,
      )
      .all()
  ).map((row) => ({
    ...JSON.parse(String(row.data)),
    id: row.id,
    brand: row.brand,
    brandId: row.brand_id,
    active: !!row.active,
    revision: Number(row.revision),
  })) as CatalogProduct[];
  const brands = (await db
    .prepare("SELECT id,name FROM brands ORDER BY name")
    .all()) as unknown as CatalogBrand[];
  return {
    products,
    brands: publicOnly
      ? brands.filter((b) => products.some((p) => p.brandId === b.id))
      : brands,
  };
}
function text(value: unknown, label: string, max = 160) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new InputError(`${label} is required (maximum ${max} characters).`);
  return value.trim();
}
function number(value: unknown, label: string, max: number, min = 1) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new InputError(`${label} must be between ${min} and ${max}.`);
  return value;
}
export async function mutateCatalog(body: Record<string, unknown>) {
  const db = await database();
  await db.exec("BEGIN IMMEDIATE");
  try {
    if (body.action === "saveBrand") {
      const name = text(body.name, "Brand name", 60).toUpperCase();
      if (body.id) {
        const result = await db
          .prepare("UPDATE brands SET name=? WHERE id=?")
          .run(name, text(body.id, "Brand ID"));
        if (!result.changes)
          throw new InputError(
            "This brand no longer exists. Refresh the page.",
            409,
          );
      } else
        await db
          .prepare("INSERT INTO brands (id,name) VALUES (?,?)")
          .run(randomUUID(), name);
    } else if (
      body.action === "deleteBrand" ||
      body.action === "deleteProduct"
    ) {
      if (body.action === "deleteBrand")
        await db
          .prepare("DELETE FROM products WHERE brand_id=?")
          .run(text(body.id, "ID"));
      const table = body.action === "deleteBrand" ? "brands" : "products";
      const result = await db
        .prepare(`DELETE FROM ${table} WHERE id=?`)
        .run(text(body.id, "ID"));
      if (!result.changes)
        throw new InputError(
          "This item has already been removed. Refresh the page.",
          409,
        );
    } else if (body.action === "saveProduct") {
      if (!body.product || typeof body.product !== "object")
        throw new InputError("Battery details are required.");
      const p = body.product as Record<string, unknown>;
      const brandId = text(p.brandId, "Brand");
      if (!(await db.prepare("SELECT id FROM brands WHERE id=?").get(brandId)))
        throw new InputError("Choose an existing brand.");
      if (!["Maintenance-free", "Dry-charged"].includes(String(p.batteryType)))
        throw new InputError("Choose a valid battery type.");
      if (typeof p.active !== "boolean")
        throw new InputError("Choose a publishing status.");
      const image = text(p.image, "Battery photo", 200);
      const uploadId = /^\/api\/media\/([a-f0-9-]{36})$/.exec(image)?.[1];
      const seededImages = [
        "/products/osaka.webp",
        "/products/volta.webp",
        "/products/dl-r-55.webp",
        "/products/dls-rs-80.webp",
      ];
      if (
        !seededImages.includes(image) &&
        (!uploadId ||
          !(await db.prepare("SELECT id FROM images WHERE id=?").get(uploadId)))
      )
        throw new InputError("Please upload a valid battery photo.");
      const product = {
        model: text(p.model, "Model", 100),
        batteryType: p.batteryType,
        category: "Car Batteries",
        capacityAh: number(p.capacityAh, "Capacity", 10000),
        voltage: number(p.voltage, "Voltage", 1000),
        application: text(p.application, "Application", 120),
        warranty: text(p.warranty, "Warranty"),
        availability: text(p.availability, "Availability"),
        price:
          p.price === null
            ? null
            : Math.round(number(p.price, "Price", 10000000, 0) * 100) / 100,
        image,
        priceSource: "",
        priceDate: new Date().toISOString().slice(0, 10),
        featured: false,
      };
      if (p.id) {
        const result = await db
          .prepare(
            "UPDATE products SET brand_id=?,model=?,data=?,active=?,revision=revision+1 WHERE id=? AND revision=?",
          )
          .run(
            brandId,
            product.model,
            JSON.stringify(product),
            p.active ? 1 : 0,
            text(p.id, "ID"),
            number(p.revision, "Revision", Number.MAX_SAFE_INTEGER),
          );
        if (!result.changes)
          throw new InputError(
            "This battery was changed or deleted in another session. Close this form and refresh before editing again.",
            409,
          );
      } else
        await db
          .prepare(
            "INSERT INTO products (id,brand_id,model,data,active) VALUES (?,?,?,?,?)",
          )
          .run(
            randomUUID(),
            brandId,
            product.model,
            JSON.stringify(product),
            p.active ? 1 : 0,
          );
    } else throw new InputError("Unknown catalog action.");
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    if ((error as Error).message.includes("UNIQUE constraint"))
      throw new InputError(
        "That name already exists. Use a different brand or model name.",
        409,
      );
    throw error;
  }
  return catalog();
}
