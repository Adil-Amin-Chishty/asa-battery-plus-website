# ASA BATTERY PLUS

Responsive Next.js, TypeScript and Tailwind CSS car-battery showroom with retail and wholesale WhatsApp inquiries and a private admin catalog manager. No checkout or customer accounts.

## Run

Use Node.js 24 or newer. Run `npm install`, `npm run admin:setup`, then `npm run dev`. Open http://localhost:3000 and http://localhost:3000/admin.
Production: `npm run build` then `npm start`.

On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

## Admin panel

The one-time setup command prompts for an email and password (12+ characters), then saves the email and a salted scrypt password hash in ignored `.env.local`. It never stores the plaintext password. Restart the app after setup. There is no default login. Run the setup command again to reset credentials; old sessions become invalid.

- **Batteries:** add, edit, delete, search and filter models. Update the photo, PKR price, capacity, voltage, application, warranty, availability and publishing status. A blank price means price on request; zero is a valid price.
- **Brands:** add, rename or delete parent brands. Each battery has exactly one brand ID. Renaming a brand keeps its products attached. Deleting a brand requires confirmation and deletes all its products in one transaction.
- **Visibility:** only published products and brands containing at least one published product appear publicly. Empty brands stay available in the admin panel. Hidden products can be published again later.
- **Photos:** upload real JPG, PNG or WebP images up to 5 MB / 25 megapixels. The admin automatically removes the background in a browser worker and shows a transparent preview alongside the original. You can retry, cancel processing or choose **Keep original** if the cutout is unsuitable. The server crops transparent borders and centers the battery on a transparent square with proportional padding (up to 1200 × 1200). Small photos use a smaller canvas so the battery still fills the frame without blurring its label through upscaling. It applies gentle brightness/sharpness improvement, strips metadata and saves high-quality WebP in the existing database. Recent unused uploads are retained for 24 hours; later uploads clean up older unreferenced images.
- **Freshness:** saves are available on the next website load. Already-open pages refresh on focus and every minute while visible. Product revision checks prevent silently overwriting another session's changes.

The existing catalog is seeded **once** into a new database. Removing all products/brands does not re-create them on restart. The `data/*.ts` files are seed data, not the live catalog. Normal catalog changes never require source edits or a redeploy.

## Free-tier deployment: Netlify + Turso

This project includes `netlify.toml`. Netlify runs the Next.js server routes; a hosted **libSQL** database in Turso stores brands, products, compressed photos, sessions and login limits. This avoids saving uploads to temporary serverless disks. Select a libSQL-compatible database when creating the Turso database (`@libsql/client` is used).

1. Create a Turso libSQL database and obtain its database URL and authentication token. Use a separate database for preview/test deployments.
2. Run `npm run admin:setup` locally to choose the owner's login.
3. Import this repository in Netlify. Use build command `npm run build`, publish directory `.next`, and Node 24. Netlify detects the Next.js runtime automatically.
4. Set the following environment variables in Netlify for builds and functions. Keep them private; none use a `NEXT_PUBLIC_` prefix.

| Variable | Value |
| --- | --- |
| `TURSO_DATABASE_URL` | Your hosted libSQL database URL |
| `TURSO_AUTH_TOKEN` | Database authentication token |
| `ADMIN_EMAIL` | Email from `.env.local` |
| `ADMIN_PASSWORD_HASH` | Full salted hash from `.env.local` |
| `APP_ORIGIN` | Exact public HTTPS origin, e.g. `https://your-shop.netlify.app`, without a trailing slash |

5. Deploy, open `/admin`, sign in and update a battery. Reload the website to verify the live change. If using a custom domain, update `APP_ORIGIN` to that domain and redeploy.

Accounts and hosted credentials must be supplied by the owner; they are not created by the code. Hosted deployment has not been performed as part of this change. Free tiers have usage/storage limits and may pause service when limits are reached; they are not unlimited. Check [Netlify pricing](https://www.netlify.com/pricing/) and [Turso pricing](https://turso.tech/pricing) before launch. This configuration targets Netlify; Cloudflare Workers would require its own Next.js adapter and runtime/storage integration. Cloudflare can still manage the domain/DNS.

To transfer an existing local catalog into an **empty** Turso database, stop the local dev server, set the Turso variables in `.env.local`, then run `node scripts/migrate-catalog.mjs`. The transfer includes brands, products, photos and catalog initialization settings. It leaves the local database unchanged and excludes login sessions. It refuses to overwrite a different hosted catalog; rerunning against an identical catalog is a no-op. After the transfer, start or deploy the app with the same Turso settings.

Without Turso variables, development uses `storage/catalog.sqlite`. Local photos are stored inside that same database. For a persistent Node server, preserve this directory across deployments and back it up with a SQLite-aware backup tool or while the server is stopped. On Netlify/Vercel the app refuses to use local storage if remote database settings are missing. Use provider database exports/backups for hosted data. Restoring a database restores catalog records and photos together.

## Verification

`npm run typecheck`, `npm run build`, then `npm run test:admin`.

The integration test starts an isolated production server on port 3197 with temporary credentials and a disposable database. It checks authorization, same-origin protection, uploads, validation, product/brand CRUD, grouping, brand rename/reassignment, hidden/empty brands, stale edits, cascade deletion, persistence across server restarts, logout and login throttling. It does not touch the real catalog or any hosted database.

`npm run test:images` runs the actual background-removal model in WebAssembly against an existing battery photo, checks its alpha mask and final transparent WebP, and checks invalid/empty-image handling. The sample output is written to ignored `.test-storage/battery-transparent.webp`. Browser interaction testing is separate from this model test.

## Automatic photo processing

`npm run dev` and `npm run build` automatically prepare self-hosted image assets. First preparation needs internet access to download the approximately 5 MB U²-Net small (`u2netp`) model from the official rembg release; its checksum is verified. The ONNX Runtime Web WASM files are copied from the installed, pinned package. To retry preparation manually, run `npm run images:prepare`. Generated files in `public/image-tools/` are not committed and are recreated during deployment.

No paid image API, API key or third-party photo upload is used. Only the admin loads the model and runtime; the public storefront does not. A modern browser with WebAssembly, workers and OffscreenCanvas is needed. The first use can take longer while model assets load. Processing runs off the main UI thread and can be cancelled; it times out after two minutes. Complex backgrounds or low-contrast photos may require another shot or the original-photo option. The browser displays a checkerboard for transparency; that pattern is not saved into the image.

Model: [U²-Net by Xuebin Qin et al.](https://github.com/xuebinqin/U-2-Net), Apache-2.0. Model distribution/checksum: [rembg U2netp session](https://github.com/danielgatis/rembg/blob/main/rembg/sessions/u2netp.py). Runtime: [ONNX Runtime](https://github.com/microsoft/onnxruntime), MIT. License notices are in `third-party/` and copied beside the generated public assets.

The database architecture is unchanged by photo processing. For a substantially larger photo catalog, migrate image bytes to object storage and keep image keys/URLs in libSQL; compressed photos currently share the database's storage and transfer allowance.

## Edit

- `config/business.ts`: phone, WhatsApp, address, exact Google Maps link and coordinates, hours and about copy. Phone and WhatsApp are configured to 0332 5206315.
- `/admin`: manage the live catalog, brand groups, prices and photos.
- `data/batteries.ts`: initial automotive models and manufacturer reference prices, used only for seeding a new database.
- `data/brands.ts`: initial brands, used only for seeding. Empty brands are hidden publicly.
- `data/sources.md`: product photography, specifications and price provenance.
- `public/products/`: optimized manufacturer product photographs. Shared-series imagery is identified in alt text and catalog notes.

## Remaining business details

Opening hours and a shop/unit number have not been verified. Customers are asked to call for hours. The map points to the supplied shop pin. Testimonials remain clearly marked demo placeholders; replace with approved genuine feedback. Add real social links and production domain when available.

Catalog filters combine battery type, brand, capacity, application and model search. Forms construct WhatsApp messages; customers review and send them in WhatsApp. No customer information is stored server-side.

SEO includes car-battery-only title, description, Open Graph metadata and local business JSON-LD with telephone, coordinates and map link. Reference prices are not emitted as ASA Offer schema.
