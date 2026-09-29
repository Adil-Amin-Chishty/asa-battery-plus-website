"use client";
import { useState, useMemo, useEffect, useRef, type FormEvent } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  ArrowRight,
  BatteryCharging,
  Car,
  Check,
  ChevronDown,
  Clock3,
  Gauge,
  Headphones,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { business } from "@/config/business";
import type { Battery } from "@/data/batteries";
import type { Catalog } from "@/lib/catalog-types";

const nav = [
  "Home",
  "Brands",
  "Batteries",
  "Wholesale",
  "About",
  "Location",
  "Contact",
];
const generalMessage =
  "Hello ASA BATTERY PLUS,\n\nPlease share your latest battery prices and availability.\n\nThank you.";
function Logo() {
  return (
    <a href="#home" className="logo" aria-label="ASA Battery Plus home">
      <span className="logo-icon">
        <BatteryCharging size={29} />
      </span>
      <span>
        ASA <b>BATTERY PLUS</b>
        <small>POWER YOU CAN DEPEND ON</small>
      </span>
    </a>
  );
}
export default function Storefront({
  initialCatalog,
}: {
  initialCatalog: Catalog;
}) {
  const [savedCatalog, setSavedCatalog] = useState(initialCatalog);
  const batteries = savedCatalog.products;
  const brands = savedCatalog.brands.map((b) => b.name);
  useEffect(() => {
    let stopped = false;
    async function refresh() {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/catalog", { cache: "no-store" });
        if (response.ok && !stopped) setSavedCatalog(await response.json());
      } catch {
        /* Retain the last successfully loaded catalog. */
      }
    }
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const [menu, setMenu] = useState(false),
    [brand, setBrand] = useState("All brands"),
    [category, setCategory] = useState("All Batteries"),
    [capacity, setCapacity] = useState("All capacities"),
    [application, setApplication] = useState("All applications"),
    [query, setQuery] = useState(""),
    [notice, setNotice] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (notice) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [notice]);
  const products = useMemo(
    () =>
      batteries.filter(
        (p) =>
          (brand === "All brands" || p.brand === brand) &&
          (category === "All Batteries" || p.batteryType === category) &&
          (capacity === "All capacities" ||
            String(p.capacityAh) === capacity) &&
          (application === "All applications" ||
            p.application === application) &&
          `${p.brand} ${p.model}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [batteries, brand, category, capacity, application, query],
  );
  useEffect(() => {
    if (
      brand !== "All brands" &&
      !savedCatalog.brands.some((b) => b.name === brand)
    )
      setBrand("All brands");
    if (
      capacity !== "All capacities" &&
      !batteries.some((p) => String(p.capacityAh) === capacity)
    )
      setCapacity("All capacities");
    if (
      application !== "All applications" &&
      !batteries.some((p) => p.application === application)
    )
      setApplication("All applications");
  }, [savedCatalog, batteries, brand, capacity, application]);
  function whatsapp(message = generalMessage) {
    if (!business.whatsapp) {
      setNotice(true);
      return;
    }
    window.open(
      `https://wa.me/${business.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
  function call() {
    if (business.phone) window.location.href = `tel:${business.phone}`;
    else setNotice(true);
  }
  function productInquiry(p: Battery, kind: string) {
    whatsapp(
      `Hello ASA BATTERY PLUS,\n\nI want to check the ${kind} of:\n\nBrand: ${p.brand}\nModel: ${p.model}\nBattery Type: ${p.category} / ${p.batteryType}\nCapacity: ${p.capacityAh} AH\n\nQuantity: 1\n\nPlease share the latest price and availability.\n\nThank you.`,
    );
  }
  function formInquiry(e: FormEvent<HTMLFormElement>, wholesale: boolean) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    whatsapp(
      `Hello ASA BATTERY PLUS,\n\n${wholesale ? "I am interested in a wholesale battery order." : "Please recommend a suitable battery for my requirements."}\n\n${Array.from(
        data.entries(),
      )
        .map(([k, v]) => `${k}: ${v || "No preference"}`)
        .join(
          "\n",
        )}\n\n${wholesale ? "Please send your latest wholesale quotation." : "Please share a suitable model, latest price and availability."}`,
    );
  }
  return (
    <>
      <div className="topbar">
        <div className="container">
          <span>
            <MapPin size={12} /> G-8 Markaz, Islamabad
          </span>
          <span>
            YOUR LOCAL BATTERY PARTNER <i /> RETAIL & WHOLESALE
          </span>
        </div>
      </div>
      <header>
        <div className="container header-inner">
          <Logo />
          <nav aria-label="Main navigation" className={menu ? "open" : ""}>
            {nav
              .filter((n) => n !== "Brands" || brands.length > 0)
              .map((n) => (
                <a
                  key={n}
                  href={`#${n.toLowerCase()}`}
                  onClick={() => setMenu(false)}
                >
                  {n}
                </a>
              ))}
          </nav>
          <button
            className="button small header-cta"
            onClick={() => whatsapp()}
          >
            <MessageCircle size={16} /> Let’s talk <ArrowUpRight size={14} />
          </button>
          <button
            className="menu-toggle"
            aria-label="Toggle navigation"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main>
        <section className="hero" id="home">
          <div className="hero-grid container">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="red-line" /> ISLAMABAD’S BATTERY SPECIALISTS
              </div>
              <h1>
                Reliable Batteries.
                <br />
                Competitive
                <br />
                <span>Wholesale Rates.</span>
              </h1>
              <p>
                Car batteries from trusted brands — available in G-8 Markaz,
                Islamabad.
              </p>
              <div className="hero-actions">
                <button className="button" onClick={() => whatsapp()}>
                  <MessageCircle size={18} /> Check Price on WhatsApp{" "}
                  <ArrowUpRight size={17} />
                </button>
                <a className="button outline" href="#batteries">
                  View Batteries <ArrowRight size={17} />
                </a>
              </div>
              <div className="hero-points">
                <span>
                  <ShieldCheck /> Trusted brands
                </span>
                <span>
                  <Check /> Retail & wholesale available
                </span>
              </div>
            </div>
            <div className="hero-art">
              <div className="art-ring" />
              <span className="art-word">POWER</span>
              <div className="visual-label">
                <span className="live-dot" /> BUILT FOR EVERY JOURNEY
              </div>
              <Image
                className="hero-battery"
                src="/hero-battery.svg"
                alt="Illustrated automotive battery with red top and ASA Battery Plus label"
                width={690}
                height={520}
                priority
              />
              <div className="power-tag">
                <Zap size={22} />
                <span>
                  Ready when you are.<small>BUILT FOR YOUR DAILY DRIVE.</small>
                </span>
              </div>
              <div className="art-caption">
                <span>01 / DEPENDABLE POWER</span>
                <span>
                  12V <span className="muted">//</span> HIGH PERFORMANCE
                </span>
              </div>
            </div>
          </div>
        </section>
        <div className="trust-strip">
          <div className="container">
            {[
              [ShieldCheck, "Brands you trust", "Quality battery options"],
              [Gauge, "The right battery", "Guidance for your needs"],
              [Users, "Better in bulk", "Wholesale inquiries welcome"],
              [MapPin, "Right here in Islamabad", "Visit us in G-8 Markaz"],
            ].map(([Icon, title, sub]) => {
              const I = Icon as typeof ShieldCheck;
              return (
                <div key={String(title)}>
                  <I />
                  <span>
                    <strong>{String(title)}</strong>
                    <small>{String(sub)}</small>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        {brands.length > 0 && (
          <section id="brands" className="brands-section container">
            <div className="section-mini">
              <span className="eyebrow">PROVEN BRANDS. DEPENDABLE POWER.</span>
              <p>Trusted Battery Brands</p>
              <span className="muted">A brand for every power need.</span>
            </div>
            <div className="brand-row">
              {brands.map((b) => (
                <a
                  href="#batteries"
                  key={b}
                  className={`brand-logo brand-${b.toLowerCase()} ${brand === b ? "selected" : ""}`}
                  onClick={() => {
                    setBrand(b);
                    setCategory("All Batteries");
                    setCapacity("All capacities");
                    setApplication("All applications");
                    setQuery("");
                  }}
                >
                  {b}
                  <ArrowUpRight size={14} />
                </a>
              ))}
            </div>
          </section>
        )}
        <section id="batteries" className="catalog section-pad">
          <div className="container">
            <div className="section-heading">
              <div>
                <div className="eyebrow">FIND YOUR POWER</div>
                <h2>
                  The right battery.
                  <br className="mobile-break" /> For every drive.
                </h2>
                <p>
                  Explore car battery models and reference prices in PKR. Ask us
                  for your latest quotation.
                </p>
              </div>
              <a href="#finder" className="text-link">
                Not sure which battery? <ArrowUpRight size={17} />
              </a>
            </div>
            <div className="category-tabs" aria-label="Battery category">
              {["All Batteries", "Maintenance-free", "Dry-charged"].map(
                (c, i) => {
                  const I = [BatteryCharging, Car, Zap, BatteryCharging][i];
                  return (
                    <button
                      key={c}
                      className={category === c ? "active" : ""}
                      onClick={() => setCategory(c)}
                    >
                      <I size={17} />
                      {c}
                    </button>
                  );
                },
              )}
            </div>
            <div className="filters">
              <label className="search">
                <Search size={18} />
                <input
                  placeholder="Search by battery model or brand"
                  aria-label="Search by battery model or brand"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <Filter
                label="Brand"
                value={brand}
                onChange={setBrand}
                options={["All brands", ...brands]}
              />
              <Filter
                label="Capacity"
                value={capacity}
                onChange={setCapacity}
                options={[
                  "All capacities",
                  ...Array.from(
                    new Set(batteries.map((b) => String(b.capacityAh))),
                  ).sort((a, b) => +a - +b),
                ]}
              />
              <Filter
                label="Application"
                value={application}
                onChange={setApplication}
                options={[
                  "All applications",
                  ...Array.from(new Set(batteries.map((p) => p.application))),
                ]}
              />
            </div>
            <div className="catalog-meta">
              <span>
                Showing <b>{products.length}</b> battery options
              </span>
              <span>
                <SlidersHorizontal size={13} /> Car batteries only · confirm
                stock before visiting
              </span>
            </div>
            <div className="product-grid">
              {products.map((p) => (
                <article className="product-card" key={p.id}>
                  <div className="product-image">
                    <span className="product-category">{p.category}</span>
                    <Image
                      src={p.image}
                      alt={`${p.brand} ${p.model} car battery${p.imageNote ? ` — ${p.imageNote}` : ""}`}
                      width={300}
                      height={215}
                      sizes="(max-width: 600px) 45vw, (max-width: 850px) 45vw, 280px"
                    />
                    <span
                      className={`product-brand brand-${p.brand.toLowerCase()}`}
                    >
                      {p.brand}
                    </span>
                  </div>
                  <div className="product-body">
                    <span className="eyebrow">{p.brand}</span>
                    <h3>{p.model}</h3>
                    <p className="battery-type">{p.batteryType}</p>
                    <div className="specs">
                      <span>
                        <Zap size={14} />
                        {p.voltage}V
                      </span>
                      <span>
                        <BatteryCharging size={14} />
                        {p.capacityAh} AH
                      </span>
                      <span>{p.application}</span>
                    </div>
                    <div className="warranty">
                      <ShieldCheck size={13} /> Warranty: {p.warranty}
                    </div>
                    <div className="availability">
                      <span />
                      {p.availability}
                    </div>
                    <div className="price">
                      <small>
                        {p.priceSource
                          ? "Published reference price"
                          : "Shop price"}
                      </small>
                      {p.price !== null
                        ? `PKR ${p.price.toLocaleString("en-PK")}`
                        : "Call / WhatsApp for Latest Price"}
                      {p.priceSource && (
                        <a
                          href={p.priceSource}
                          target="_blank"
                          rel="noreferrer"
                          className="price-source"
                        >
                          {p.priceDate} · source <ArrowUpRight size={10} />
                        </a>
                      )}
                    </div>
                    <button
                      className="button product-button"
                      onClick={() => productInquiry(p, "availability")}
                    >
                      Check Availability <ArrowUpRight size={15} />
                    </button>
                    <button
                      className="price-link"
                      onClick={() => productInquiry(p, "price")}
                    >
                      <MessageCircle size={14} /> Get Price on WhatsApp
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {products.length === 0 && (
              <div className="empty">
                <Search />
                <h3>No matching listed models</h3>
                <p>
                  Not every brand and model is listed online. Ask us about your
                  preferred car battery.
                </p>
                <button
                  className="button"
                  onClick={() =>
                    whatsapp(
                      `Hello ASA BATTERY PLUS, please share car battery models, prices and availability for ${brand === "All brands" ? "my vehicle" : brand}.`,
                    )
                  }
                >
                  Ask about {brand === "All brands" ? "a battery" : brand}{" "}
                  <MessageCircle size={16} />
                </button>
                <button
                  className="button outline"
                  onClick={() => {
                    setBrand("All brands");
                    setCapacity("All capacities");
                    setApplication("All applications");
                    setCategory("All Batteries");
                    setQuery("");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
            <p className="catalog-note">
              Prices marked as reference prices are manufacturer prices. Ask for
              the latest PKR price, stock, warranty and any old-battery exchange
              adjustment. Vehicle fitment and terminal orientation must be
              confirmed. Manufacturer photos may show a shared series; packaging
              can vary.
            </p>
          </div>
        </section>
        <section className="wholesale-section section-pad" id="wholesale">
          <div className="container wholesale-grid">
            <div className="wholesale-copy">
              <span className="eyebrow">YOUR BUSINESS. POWERED.</span>
              <h2>
                Need Batteries
                <br />
                in <span>Bulk?</span>
              </h2>
              <p>
                We supply car batteries at competitive wholesale rates for
                workshops, dealers, businesses and bulk buyers.
              </p>
              <div className="wholesale-benefits">
                {[
                  "Competitive wholesale quotations",
                  "Multiple trusted brands, one place",
                  "Personal support for your requirements",
                ].map((t) => (
                  <span key={t}>
                    <Check size={16} />
                    {t}
                  </span>
                ))}
              </div>
              <div className="bulk-icon">
                <Truck size={39} />
                <span>
                  From one battery to your next bulk order.
                  <small>LET’S FIND THE RIGHT SOLUTION.</small>
                </span>
              </div>
            </div>
            <form
              className="inquiry-form"
              onSubmit={(e) => formInquiry(e, true)}
            >
              <h3>Request a wholesale quotation</h3>
              <p>Tell us what you need. We’ll take it from there.</p>
              <div className="form-grid">
                <Field
                  label="Contact Name"
                  required
                  placeholder="Your full name"
                />
                <Field
                  label="Business Name"
                  required
                  placeholder="Your business / workshop"
                />
                <SelectField
                  label="Required Brand"
                  options={["Any brand", ...brands]}
                />
                <SelectField
                  label="Battery Type"
                  options={[
                    "Maintenance-free car battery",
                    "Dry-charged car battery",
                    "Help me choose",
                  ]}
                />
                <Field label="Model" placeholder="Model, if known" />
                <Field
                  label="Quantity"
                  type="number"
                  required
                  placeholder="e.g. 10"
                />
                <Field
                  label="Phone"
                  type="tel"
                  required
                  placeholder="03XX XXXXXXX"
                />
              </div>
              <button className="button" type="submit">
                <MessageCircle size={17} /> Send Wholesale Inquiry on WhatsApp{" "}
                <ArrowUpRight size={16} />
              </button>
              <small className="form-footnote">
                Your details are sent through WhatsApp when you choose to send.
              </small>
            </form>
          </div>
        </section>
        <section className="why-section section-pad container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">MORE THAN JUST BATTERIES</span>
              <h2>A local partner you can rely on.</h2>
            </div>
            <p>
              Practical advice. Trusted options.
              <br />
              Reliable starts for your daily drive.
            </p>
          </div>
          <div className="benefit-grid">
            {[
              [
                Gauge,
                "Competitive Wholesale Rates",
                "Get a quotation tailored to your quantity and business needs.",
              ],
              [
                ShieldCheck,
                "Trusted Battery Brands",
                "Explore well-known brands for your car and everyday driving.",
              ],
              [
                Users,
                "Retail & Bulk Orders",
                "A battery for your car or an order for your business.",
              ],
              [
                Headphones,
                "Expert Battery Guidance",
                "Tell us your requirements. We’ll help you find the right fit.",
              ],
              [
                MessageCircle,
                "Easy WhatsApp Inquiry",
                "Ask about specifications, prices and availability in one chat.",
              ],
              [
                MapPin,
                "Convenient G-8 Markaz Location",
                "Find us in Islamabad and discuss your needs in person.",
              ],
            ].map(([Icon, title, desc]) => {
              const I = Icon as typeof Gauge;
              return (
                <article key={String(title)}>
                  <I />
                  <h3>{String(title)}</h3>
                  <p>{String(desc)}</p>
                </article>
              );
            })}
          </div>
        </section>
        <section id="finder" className="finder container">
          <div>
            <span className="eyebrow">A LITTLE GUIDANCE GOES A LONG WAY</span>
            <h2>Find the right battery.</h2>
            <p>
              Tell us your car model and year. We’ll help find the right fit.
            </p>
          </div>
          <form onSubmit={(e) => formInquiry(e, false)}>
            <Field
              label="Car Model / Year"
              required
              placeholder="e.g. Toyota Corolla 2018"
            />
            <SelectField
              label="Brand Preference"
              options={["Any brand", ...brands]}
            />
            <Field label="Required AH" type="number" placeholder="If known" />
            <SelectField
              label="Battery Type"
              options={[
                "Not sure",
                "Maintenance-free car battery",
                "Dry-charged car battery",
              ]}
            />
            <button className="button" type="submit">
              <MessageCircle size={17} /> Ask on WhatsApp
            </button>
          </form>
        </section>
        <section id="about" className="about-section section-pad container">
          <div>
            <span className="eyebrow">ROOTED IN ISLAMABAD</span>
            <h2>
              Your neighborhood
              <br />
              battery specialists.
            </h2>
          </div>
          <div>
            <p>{business.about}</p>
            <a className="text-link" href="#location">
              Come visit our shop <ArrowUpRight size={17} />
            </a>
          </div>
        </section>
        <section id="location" className="location-section section-pad">
          <div className="container location-grid">
            <div id="contact">
              <span className="eyebrow">GOOD POWER. CLOSE TO HOME.</span>
              <h2>Visit ASA BATTERY PLUS.</h2>
              <p className="location-lead">Let’s get you powered up.</p>
              <div className="contact-row">
                <MapPin />
                <div>
                  <h3>G-8 Markaz, Islamabad</h3>
                  <p>{business.fullAddress}</p>
                </div>
              </div>
              <div className="contact-row">
                <Clock3 />
                <div>
                  <h3>Opening hours</h3>
                  <p>{business.openingHours}</p>
                </div>
              </div>
              <div className="contact-row">
                <Phone />
                <div>
                  <h3>Call or WhatsApp</h3>
                  <p>
                    <a href={`tel:${business.phone}`}>
                      {business.phoneDisplay}
                    </a>
                    <br />
                    Same number for WhatsApp inquiries
                  </p>
                </div>
              </div>
              <div className="contact-actions">
                <a
                  className="button"
                  href={business.googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin size={16} /> Get Directions
                </a>
                <button className="button outline" onClick={call}>
                  <Phone size={16} /> Call Now
                </button>
                <button
                  aria-label="Contact on WhatsApp"
                  className="button outline"
                  onClick={() => whatsapp()}
                >
                  <MessageCircle size={18} />
                </button>
              </div>
            </div>
            <div className="shop-map">
              <iframe
                src={business.googleMapsEmbedUrl}
                title="ASA Battery Plus shop location in G-8 Markaz, Islamabad"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              <a
                className="map-open"
                href={business.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                <MapPin size={16} /> ASA Battery Plus · Open in Google Maps{" "}
                <ArrowUpRight size={15} />
              </a>
            </div>
          </div>
        </section>
        <section className="faq-section section-pad container">
          <div>
            <span className="eyebrow">A FEW THINGS TO KNOW</span>
            <h2>
              Questions?
              <br />
              We’ve got answers.
            </h2>
            <p>Need something more specific?</p>
            <button className="text-link" onClick={() => whatsapp()}>
              Talk to us on WhatsApp <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="faqs">
            {[
              [
                "Do you sell car batteries?",
                "Yes, we stock car batteries from multiple trusted brands. Contact us to confirm the right model and availability.",
              ],
              [
                "Which car battery is right for my vehicle?",
                "Share your car make, model, year and engine size on WhatsApp. We will help you check capacity, battery dimensions and terminal orientation before you buy.",
              ],
              [
                "Do you offer wholesale rates?",
                "Yes, wholesale and bulk purchase inquiries are welcome. Share your brand, model and quantity for a quotation.",
              ],
              [
                "Can I check the latest price online?",
                "Yes. Published reference prices are displayed in PKR. Contact us on WhatsApp for the current ASA selling price, availability and any applicable exchange adjustment.",
              ],
              [
                "Do you provide battery installation?",
                "Please contact us to confirm installation availability.",
              ],
              [
                "Can I reserve a battery before visiting?",
                "Yes, customers can contact ASA BATTERY PLUS through WhatsApp to confirm availability and arrange a reservation before visiting.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <Plus size={17} />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="testimonials container">
          <div className="section-heading">
            <h2>Built on better service.</h2>
            <span className="demo-label">DEMO TESTIMONIALS · PLACEHOLDERS</span>
          </div>
          <div className="testimonial-grid">
            {[
              "Quick response and competitive battery rates.",
              "Helpful guidance to find a suitable battery.",
              "An easy way to inquire about a bulk order.",
            ].map((t, i) => (
              <blockquote key={t}>
                <span className="quote-mark">“</span>
                <p>{t}</p>
                <footer>
                  Demo feedback {String(i + 1).padStart(2, "0")}
                  <span>Replace with verified customer feedback</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
        <section className="final-cta container">
          <div>
            <h2>Your next battery starts with a conversation.</h2>
            <p>Check the price. Confirm availability. Visit with confidence.</p>
          </div>
          <button className="button" onClick={() => whatsapp()}>
            <MessageCircle size={18} /> Let’s talk on WhatsApp{" "}
            <ArrowUpRight size={17} />
          </button>
        </section>
      </main>
      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <Logo />
            <p>
              Reliable power for your journey,
              <br />
              your car and your business.
            </p>
            <span className="footer-location">
              <MapPin size={14} /> G-8 Markaz, Islamabad
            </span>
          </div>
          <div>
            <h3>Explore</h3>
            {["Batteries", "Wholesale", "About", "Location"].map((n) => (
              <a href={`#${n.toLowerCase()}`} key={n}>
                {n}
              </a>
            ))}
          </div>
          <div>
            {brands.length > 0 && <h3>Our brands</h3>}
            {brands.map((b) => (
              <a key={b} href="#batteries" onClick={() => setBrand(b)}>
                {b}
              </a>
            ))}
          </div>
          <div>
            <h3>Get in touch</h3>
            <button onClick={() => whatsapp()}>
              WhatsApp <ArrowUpRight size={13} />
            </button>
            <button onClick={call}>{business.phoneDisplay}</button>
            <p>{business.openingHours}</p>
            <span className="social-placeholder">
              Facebook / Instagram — coming soon
            </span>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} ASA BATTERY PLUS. All rights reserved.
          </span>
          <span>
            RETAIL & WHOLESALE <i /> ISLAMABAD, PAKISTAN
          </span>
        </div>
      </footer>
      <div className="mobile-actions">
        <button onClick={call}>
          <Phone size={18} /> Call
        </button>
        <button onClick={() => whatsapp()}>
          <MessageCircle size={19} /> WhatsApp
        </button>
        <a href={business.googleMapsUrl} target="_blank" rel="noreferrer">
          <MapPin size={18} /> Directions
        </a>
      </div>
      <dialog
        ref={dialogRef}
        className="notice"
        aria-labelledby="notice-title"
        onCancel={() => setNotice(false)}
      >
        <MessageCircle size={32} />
        <h2 id="notice-title">Contact details coming soon</h2>
        <p>
          This is a business preview. Phone and WhatsApp inquiries will be
          available once the shop contact details are confirmed.
        </p>
        <p>You can explore G-8 Markaz using the directions link.</p>
        <button autoFocus className="button" onClick={() => setNotice(false)}>
          Got it <Check size={17} />
        </button>
      </dialog>
    </>
  );
}
function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="filter">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {label === "Capacity" && o !== "All capacities" ? `${o} AH` : o}
          </option>
        ))}
      </select>
      <ChevronDown size={14} />
    </label>
  );
}
function Field({
  label,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="form-field">
      {label}
      {required ? " *" : ""}
      <input
        name={label}
        placeholder={placeholder}
        type={type}
        required={required}
        min={type === "number" ? 1 : undefined}
      />
    </label>
  );
}
function SelectField({
  label,
  options,
}: {
  label: string;
  options: readonly string[];
}) {
  return (
    <label className="form-field">
      {label}
      <select name={label}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
