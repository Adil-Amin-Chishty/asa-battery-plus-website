# ASA BATTERY PLUS

Responsive Next.js, TypeScript and Tailwind CSS car-battery showroom with retail and wholesale WhatsApp inquiries. No checkout, payment, delivery or accounts.

## Run

`npm install` then `npm run dev`. Open http://localhost:3000.
Production: `npm run build` then `npm start`.

## Edit

- `config/business.ts`: phone, WhatsApp, address, exact Google Maps link and coordinates, hours and about copy. Phone and WhatsApp are configured to 0332 5206315.
- `data/batteries.ts`: real automotive models, specifications and published PKR reference prices. Prices do not represent confirmed ASA quotations. Update from the shop before advertising firm prices.
- `data/brands.ts`: five supported brands. Brand filters for models not yet listed offer a targeted WhatsApp inquiry.
- `data/sources.md`: product photography, specifications and price provenance.
- `public/products/`: optimized manufacturer product photographs. Shared-series imagery is identified in alt text and catalog notes.

## Remaining business details

Opening hours and a shop/unit number have not been verified. Customers are asked to call for hours. The map points to the supplied shop pin. Testimonials remain clearly marked demo placeholders; replace with approved genuine feedback. Add real social links and production domain when available.

Catalog filters combine battery type, brand, capacity, application and model search. Forms construct WhatsApp messages; customers review and send them in WhatsApp. No customer information is stored server-side.

SEO includes car-battery-only title, description, Open Graph metadata and local business JSON-LD with telephone, coordinates and map link. Reference prices are not emitted as ASA Offer schema.
