import type { Metadata } from "next";
import "./globals.css";
import { business } from "@/config/business";
export const metadata: Metadata = {
  title: "ASA BATTERY PLUS | Car Batteries in Islamabad",
  description:
    "Shop car batteries from trusted brands at ASA BATTERY PLUS in G-8 Markaz, Islamabad. Retail and wholesale inquiries available.",
  openGraph: {
    title: "ASA BATTERY PLUS | Power you can depend on.",
    description:
      "Trusted battery brands. Retail and wholesale inquiries in G-8 Markaz, Islamabad.",
    type: "website",
    locale: "en_PK",
  },
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    name: business.businessName,
    description: business.about,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Islamabad",
      streetAddress: "G-8 Markaz",
      addressCountry: "PK",
    },
    hasMap: business.googleMapsUrl,
    geo: {
      "@type": "GeoCoordinates",
      latitude: business.latitude,
      longitude: business.longitude,
    },
    ...(business.phone ? { telephone: business.phone } : {}),
    ...(business.siteUrl ? { url: business.siteUrl } : {}),
  };
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
          }}
        />
        {children}
      </body>
    </html>
  );
}
