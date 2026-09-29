"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { removePhotoBackground } from "./photo-processing";
import {
  BatteryCharging,
  Plus,
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  LogOut,
  Upload,
  X,
  ShieldCheck,
} from "lucide-react";
import type {
  Catalog,
  CatalogProduct,
  CatalogBrand,
} from "@/lib/catalog-types";

async function request(url: string, method = "GET", body?: unknown) {
  const response = await fetch(url, {
    method,
    cache: "no-store",
    ...(body
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

export default function AdminPanel() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("products");
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<CatalogProduct | "new" | null>(null);
  const [brandEditor, setBrandEditor] = useState<CatalogBrand | "new" | null>(
    null,
  );
  const [removal, setRemoval] = useState<{
    kind: "brand" | "product";
    id: string;
    label: string;
    count?: number;
  } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const modalOpen = !!(editor || brandEditor || removal);
  useEffect(() => {
    request("/api/admin/catalog")
      .then(setCatalog)
      .catch((e) => {
        if (e.message !== "Please sign in.") setError(e.message);
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (modalOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modalOpen]);
  function close() {
    if (!busy) {
      setEditor(null);
      setBrandEditor(null);
      setRemoval(null);
      setError("");
    }
  }
  async function mutate(body: unknown, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await request("/api/admin/catalog", "POST", body);
      setCatalog(updated);
      setEditor(null);
      setBrandEditor(null);
      setRemoval(null);
      setMessage(success);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await request("/api/admin/session", "POST", values);
      setCatalog(await request("/api/admin/catalog"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <main className="admin-login">
        <p role="status">Loading your workspace…</p>
      </main>
    );
  if (!catalog)
    return (
      <main className="admin-login">
        <form className="admin-login-card" onSubmit={login}>
          <span className="admin-mark">
            <BatteryCharging />
          </span>
          <p className="admin-kicker">ASA BATTERY PLUS</p>
          <h1>Welcome back.</h1>
          <p>Sign in to manage your battery catalog.</p>
          <label>
            Email
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p className="admin-error" role="alert">
              {error}
            </p>
          )}
          <button className="admin-primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <a href="/">← Back to website</a>
          <small>
            <ShieldCheck size={14} /> Private admin workspace
          </small>
        </form>
      </main>
    );
  const visible = catalog.products.filter((p) => p.active);
  const products = catalog.products.filter(
    (p) =>
      (!brand || p.brandId === brand) &&
      `${p.brand} ${p.model}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="admin-top">
        <a className="admin-wordmark" href="/admin">
          <span className="admin-mark">
            <BatteryCharging size={23} />
          </span>
          <span>
            ASA BATTERY PLUS<small>Catalog manager</small>
          </span>
        </a>
        <div>
          <a href="/" target="_blank" rel="noreferrer">
            View website <ExternalLink size={15} />
          </a>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await request("/api/admin/session", "DELETE");
                setCatalog(null);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
      <main className="admin-main">
        <div className="admin-heading">
          <div>
            <p className="admin-kicker">YOUR STORE, UP TO DATE</p>
            <h1>Catalog overview</h1>
            <p>
              Manage your batteries and brands. Changes go live when you save.
            </p>
          </div>
          <button
            className="admin-primary"
            onClick={() => {
              setError("");
              tab === "products" ? setEditor("new") : setBrandEditor("new");
            }}
            disabled={tab === "products" && !catalog.brands.length}
          >
            <Plus size={18} /> Add {tab === "products" ? "battery" : "brand"}
          </button>
        </div>
        <div className="admin-stats">
          <div>
            <span>Total batteries</span>
            <strong>{catalog.products.length}</strong>
          </div>
          <div>
            <span>Visible on website</span>
            <strong>{visible.length}</strong>
          </div>
          <div>
            <span>Brands with products</span>
            <strong>
              {
                catalog.brands.filter((b) =>
                  visible.some((p) => p.brandId === b.id),
                ).length
              }
              <small> / {catalog.brands.length}</small>
            </strong>
          </div>
        </div>
        {message && (
          <p className="admin-success" role="status">
            {message}
          </p>
        )}
        {error && !modalOpen && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        <div className="admin-tabs">
          <button
            className={tab === "products" ? "selected" : ""}
            onClick={() => setTab("products")}
          >
            Batteries <span>{catalog.products.length}</span>
          </button>
          <button
            className={tab === "brands" ? "selected" : ""}
            onClick={() => setTab("brands")}
          >
            Brands <span>{catalog.brands.length}</span>
          </button>
        </div>
        {tab === "products" ? (
          <section className="admin-card">
            <div className="admin-toolbar">
              <label className="admin-search">
                <Search size={18} />
                <input
                  aria-label="Search batteries"
                  placeholder="Search model or brand…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <select
                aria-label="Filter brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              >
                <option value="">All brands</option>
                {catalog.brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <span>{products.length} batteries</span>
            </div>
            <div className="admin-products">
              {products.map((p) => (
                <article className="admin-product" key={p.id}>
                  <img src={p.image} alt={`${p.brand} ${p.model}`} />
                  <div className="admin-product-name">
                    <small>{p.brand}</small>
                    <h2>{p.model}</h2>
                    <p>
                      {p.capacityAh} Ah · {p.voltage}V · {p.batteryType}
                    </p>
                  </div>
                  <div className="admin-product-price">
                    {p.price === null
                      ? "Price on request"
                      : `PKR ${p.price.toLocaleString("en-PK")}`}
                  </div>
                  <span
                    className={`admin-badge ${p.active ? "" : "unpublished"}`}
                  >
                    {p.active ? "Published" : "Hidden"}
                  </span>
                  <div className="admin-row-actions">
                    <button
                      aria-label={`Edit ${p.model}`}
                      onClick={() => {
                        setError("");
                        setEditor(p);
                      }}
                    >
                      <Pencil size={16} />
                      <span>Edit</span>
                    </button>
                    <button
                      className="admin-danger-icon"
                      aria-label={`Delete ${p.model}`}
                      onClick={() =>
                        setRemoval({
                          kind: "product",
                          id: p.id,
                          label: `${p.brand} ${p.model}`,
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {!products.length && (
              <div className="admin-empty">
                <BatteryCharging size={32} />
                <h2>
                  {catalog.products.length
                    ? "No matching batteries"
                    : "Your catalog starts here"}
                </h2>
                <p>
                  {catalog.brands.length
                    ? "Add a battery or adjust your search."
                    : "Add your first brand, then add its batteries."}
                </p>
              </div>
            )}
          </section>
        ) : (
          <>
            <p className="admin-help">
              Brands are the parent groups for batteries. Empty brands and
              brands with only hidden batteries do not appear on the website.
            </p>
            <div className="admin-brand-grid">
              {catalog.brands.map((b) => {
                const count = catalog.products.filter(
                  (p) => p.brandId === b.id,
                ).length;
                const live = visible.filter((p) => p.brandId === b.id).length;
                return (
                  <article className="admin-card admin-brand" key={b.id}>
                    <span
                      className={`admin-badge ${live ? "" : "unpublished"}`}
                    >
                      {live
                        ? "Visible on website"
                        : "Hidden · no published batteries"}
                    </span>
                    <h2>{b.name}</h2>
                    <p>
                      {count} batteries · {live} published
                    </p>
                    <div className="admin-row-actions">
                      <button onClick={() => setBrandEditor(b)}>
                        <Pencil size={15} /> Rename
                      </button>
                      <button
                        className="admin-danger-icon"
                        onClick={() =>
                          setRemoval({
                            kind: "brand",
                            id: b.id,
                            label: b.name,
                            count,
                          })
                        }
                      >
                        <Trash2 size={15} /> Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            {!catalog.brands.length && (
              <div className="admin-empty">
                <h2>Add your first brand</h2>
                <p>For example, Osaka or Volta.</p>
              </div>
            )}
          </>
        )}
        <p className="admin-footnote">
          <ShieldCheck size={14} /> Each battery belongs to one brand. Empty
          brands are hidden automatically.
        </p>
      </main>
      <dialog
        aria-labelledby="admin-dialog-title"
        className="admin-dialog"
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <div className="admin-dialog-heading">
          <h2 id="admin-dialog-title">
            {removal
              ? `Delete ${removal.kind}?`
              : brandEditor
                ? brandEditor === "new"
                  ? "Add brand"
                  : "Rename brand"
                : editor === "new"
                  ? "Add battery"
                  : "Edit battery"}
          </h2>
          <button aria-label="Close dialog" disabled={busy} onClick={close}>
            <X size={20} />
          </button>
        </div>
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        {editor && (
          <ProductForm
            key={editor === "new" ? "new" : editor.id}
            product={editor === "new" ? undefined : editor}
            brands={catalog.brands}
            busy={busy}
            setBusy={setBusy}
            setError={setError}
            onCancel={close}
            onSave={(product) =>
              mutate(
                { action: "saveProduct", product },
                "Battery saved. Your website is up to date.",
              )
            }
          />
        )}
        {brandEditor && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = new FormData(e.currentTarget).get("name");
              void mutate(
                {
                  action: "saveBrand",
                  id: brandEditor === "new" ? undefined : brandEditor.id,
                  name,
                },
                "Brand saved.",
              );
            }}
          >
            <label>
              Brand name
              <input
                name="name"
                required
                maxLength={60}
                defaultValue={brandEditor === "new" ? "" : brandEditor.name}
                placeholder="e.g. OSAKA"
              />
            </label>
            <p className="admin-help">
              It will appear on the website once it has a published battery.
            </p>
            <div className="admin-form-actions">
              <button type="button" disabled={busy} onClick={close}>
                Cancel
              </button>
              <button className="admin-primary" disabled={busy}>
                {busy ? "Saving…" : "Save brand"}
              </button>
            </div>
          </form>
        )}
        {removal && (
          <>
            <p>
              Delete <strong>{removal.label}</strong>?
            </p>
            <p className="admin-help">
              {removal.kind === "brand"
                ? `This also permanently deletes all ${removal.count} batteries in this brand. The brand will disappear from the website.`
                : "This battery will be permanently removed from the catalog and website."}{" "}
              This cannot be undone.
            </p>
            <div className="admin-form-actions">
              <button disabled={busy} onClick={close}>
                Cancel
              </button>
              <button
                className="admin-destructive"
                disabled={busy}
                onClick={() =>
                  mutate(
                    {
                      action:
                        removal.kind === "brand"
                          ? "deleteBrand"
                          : "deleteProduct",
                      id: removal.id,
                    },
                    "Deleted successfully.",
                  )
                }
              >
                {busy ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}

function ProductForm({
  product,
  brands,
  busy,
  setBusy,
  setError,
  onSave,
  onCancel,
}: {
  product?: CatalogProduct;
  brands: CatalogBrand[];
  busy: boolean;
  setBusy: (b: boolean) => void;
  setError: (s: string) => void;
  onSave: (p: unknown) => void;
  onCancel: () => void;
}) {
  const [image, setImage] = useState(product?.image || "");
  const [original, setOriginal] = useState<File>();
  const [originalPreview, setOriginalPreview] = useState("");
  const [photoStatus, setPhotoStatus] = useState("");
  const [processing, setProcessing] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!original) return;
    const url = URL.createObjectURL(original);
    setOriginalPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [original]);
  useEffect(() => () => controller.current?.abort(), []);
  async function upload(file?: File, removeBackground = true) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please choose a JPG, PNG or WebP photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Please choose a photo smaller than 5 MB.");
      return;
    }
    setBusy(true);
    setProcessing(true);
    setError("");
    setOriginal(file);
    const abort = new AbortController();
    controller.current = abort;
    try {
      let photo: Blob = file;
      if (removeBackground)
        photo = await removePhotoBackground(file, setPhotoStatus, abort.signal);
      if (photo.size > 5 * 1024 * 1024)
        throw new Error(
          "The processed photo is too large. Try a smaller photo.",
        );
      setPhotoStatus("Sharpening and saving photo…");
      const form = new FormData();
      form.set("file", photo, removeBackground ? "battery.png" : file.name);
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: form,
        signal: abort.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setImage(result.url);
      setPhotoStatus(
        removeBackground
          ? "Transparent photo ready. Review it, then save the battery."
          : "Original photo selected. Review it, then save the battery.",
      );
    } catch (e) {
      setError((e as Error).message || "Photo upload failed. Try again.");
      setPhotoStatus("");
    } finally {
      setBusy(false);
      setProcessing(false);
      controller.current = null;
    }
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!image) {
          setError("Please upload a battery photo.");
          return;
        }
        const values = Object.fromEntries(new FormData(e.currentTarget));
        onSave({
          ...values,
          id: product?.id,
          revision: product?.revision,
          image,
          price: values.price === "" ? null : Number(values.price),
          capacityAh: Number(values.capacityAh),
          voltage: Number(values.voltage),
          active: values.active === "on",
        });
      }}
    >
      {processing && (
        <div className="admin-photo-progress" role="status">
          <span>{photoStatus}</span>
          <button type="button" onClick={() => controller.current?.abort()}>
            Cancel processing
          </button>
        </div>
      )}
      <fieldset disabled={busy}>
        <div className="admin-photo">
          {image ? (
            <img src={image} alt="Battery photo preview" />
          ) : (
            <BatteryCharging size={48} />
          )}
          <div>
            <strong>Battery photo</strong>
            <p>
              Background removed automatically. JPG, PNG or WebP, up to 5 MB.
            </p>
            <label className="admin-upload">
              <Upload size={15} />{" "}
              {busy ? "Please wait…" : image ? "Change photo" : "Upload photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  void upload(file);
                }}
              />
            </label>
          </div>
        </div>
        {original && (
          <div className="admin-photo-review">
            <div>
              <span>Original</span>
              {originalPreview && (
                <img
                  src={originalPreview}
                  alt="Original upload before background removal"
                />
              )}
            </div>
            <div>
              <span>Selected photo</span>
              {image && (
                <img
                  src={image}
                  alt="Selected battery photo on a transparency grid"
                />
              )}
            </div>
            <p>Check the battery edges and label before saving.</p>
            <div className="admin-photo-choices">
              <button type="button" onClick={() => void upload(original)}>
                Retry background removal
              </button>
              <button
                type="button"
                onClick={() => void upload(original, false)}
              >
                Keep original
              </button>
            </div>
          </div>
        )}
        {!processing && photoStatus && (
          <p className="admin-help" role="status">
            {photoStatus}
          </p>
        )}
        <div className="admin-form-grid">
          <label>
            Brand
            <select
              name="brandId"
              required
              defaultValue={product?.brandId || brands[0]?.id}
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Model name
            <input
              name="model"
              required
              maxLength={100}
              defaultValue={product?.model}
              placeholder="e.g. HT 60L"
            />
          </label>
          <label>
            Price (PKR)
            <input
              name="price"
              type="number"
              min="0"
              max="10000000"
              step="0.01"
              defaultValue={product?.price ?? ""}
              placeholder="Leave blank for price on request"
            />
          </label>
          <label>
            Battery type
            <select
              name="batteryType"
              defaultValue={product?.batteryType || "Maintenance-free"}
            >
              <option>Maintenance-free</option>
              <option>Dry-charged</option>
            </select>
          </label>
          <label>
            Capacity (Ah)
            <input
              name="capacityAh"
              required
              type="number"
              min="1"
              max="10000"
              step="0.1"
              defaultValue={product?.capacityAh}
            />
          </label>
          <label>
            Voltage (V)
            <input
              name="voltage"
              required
              type="number"
              min="1"
              max="1000"
              step="0.1"
              defaultValue={product?.voltage || 12}
            />
          </label>
          <label>
            Application
            <input
              name="application"
              required
              maxLength={120}
              defaultValue={product?.application || "Cars"}
            />
          </label>
          <label>
            Warranty
            <input
              name="warranty"
              required
              maxLength={160}
              defaultValue={product?.warranty || "Confirm terms with shop"}
            />
          </label>
          <label className="admin-full">
            Availability
            <input
              name="availability"
              required
              maxLength={160}
              defaultValue={product?.availability || "In stock"}
            />
          </label>
        </div>
        <label className="admin-checkbox">
          <input
            type="checkbox"
            name="active"
            defaultChecked={product?.active ?? true}
          />
          <span>
            Publish on website
            <small>Uncheck to hide this battery without deleting it.</small>
          </span>
        </label>
      </fieldset>
      <div className="admin-form-actions">
        <button type="button" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
        <button className="admin-primary" disabled={busy}>
          {busy ? "Please wait…" : "Save battery"}
        </button>
      </div>
    </form>
  );
}
