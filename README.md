# DoctorFresh — Next.js frontend

Frontend rebuild of [www.doctorfresh.in](https://www.doctorfresh.in) using
Next.js (App Router), React and plain JavaScript/JSX. The existing site's
information architecture, URLs, catalogue and content are preserved; only the
UI/UX is redesigned.

## Stack

| | |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| Language | JavaScript + JSX (no TypeScript, no `.tsx`) |
| Styling | Tailwind CSS v4 + a small design-token layer in `app/globals.css` |
| Icons | `lucide-react` |
| Components | Functional components only |

Runtime dependencies are `next`, `react`, `react-dom` and `lucide-react` — nothing else.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm start
```

## Project structure

```
app/                          route tree (App Router)
  layout.jsx                  header, footer, cart provider, global metadata
  page.jsx                    homepage
  [slug]/                     national service pages + 21,400 location SEO pages
  all-category/
  blog/[id]/[slug]/           blog detail
  blogs/                      blog listing
  blogs/[category]/           blog topic
  cart/  cart-checkout/
  category/[category]/[subcategory]/[brand]/
  compare/  careers/  contact/  login/  partner/
  legal/[slug]/               policy pages
  product/[slug]/[id]/        product detail
  registration/  search/  spare-parts/  store-locator/
  robots.js  not-found.jsx  globals.css

components/
  layout/     Header, HeaderClient, MobileMenu, Footer
  home/       Hero, TrustBadges, CategoryTiles, WaterTestSection
  products/   ProductCard, ProductGrid, ProductRail, ProductGallery,
              ProductTabs, ProductReviews, AddToCartButtons
  categories/ CategoryProducts (filters + sort + load more), SeoContent
  services/   ServicePage, ServicePackages, ServiceBookingForm
  blogs/      BlogCard
  cart/       CartProvider, CartView, CheckoutView
  forms/      Field primitives, ContactForm, PartnerForm, AuthForm, NewsletterForm
  common/     Button, Breadcrumb, SectionHeading, Accordion, FaqSection, Rating

data/         generated data layer (see below)
lib/          catalog.js (data access), utils.js, forms.js
_audit/       crawl of the live site + extractors + ROUTES.md checklist
```

## Data layer

`data/` mirrors the existing SQL records and was **extracted from the live
site**, not invented:

| File | Contents |
| --- | --- |
| `products.js` | 98 products — ids, slugs, images, price/MRP/discount, category, attributes, specifications, description, reviews, FAQs |
| `categories.js` | 18 categories, 48 subcategories, per-page SEO copy and FAQs |
| `blogs.js` | 30 posts with full article HTML, dates, authors, topics |
| `services.js` | 3 national service pages + 10 location page templates (packages with real prices, FAQs, SEO sections) |
| `locations.js` | 21,400 location slugs across 10 URL families |
| `site.js` | brand, header/footer, hero slides, trust badges, water-test form, store locations, legal pages |

**Pages never import `data/` directly.** All reads go through `lib/catalog.js`.
When the existing SQL/API is connected, only that file changes — each function
becomes a query and no UI component needs to be touched.

Form submissions go through `lib/forms.js`, which records the existing backend
endpoint for each form (`/request/form/submit.php`, `/home/subscribe`,
`/cart-checkout`, …) and currently acknowledges submission in the UI only.

The extractors that produced `data/` live in `_audit/` and can be re-run:

```bash
cd _audit
node extract-products.js && node extract-categories.js && node extract-blogs.js
node extract-services.js && node extract-site.js && node extract-locations.js
node build-data.js          # writes ../data/*.js
```

## URL compatibility

Every existing URL is preserved. See **[`_audit/ROUTES.md`](_audit/ROUTES.md)**
for the full inventory and verification results.

Two behaviours worth noting:

* Legacy `.php` URLs (`/partner.php`, `/store-locator.php`,
  `/water-purifier-service.php`) issue permanent redirects — the same 301s the
  live site serves today.
* Location pages are resolved from the slug rather than a fixed list, because
  the live site returns 200 for any slug under a location prefix (including
  `/ro-service-kanchipurum` and `/ro-service-pimpri%20chinchwad`). The sitemap
  list is used for prerendering and internal linking.

## Rendering

Server Components by default. `"use client"` is limited to genuinely
interactive parts: header menus, mobile drawer, product gallery, product tabs,
category filters, cart/checkout, accordions and forms.

678 pages are prerendered at build time (homepage, all categories, all
products, all blogs, all static pages, and the 40 highest-value locations per
family). The remaining location pages render on demand.

## SEO

* Per-route `title`, `description`, canonical, robots, Open Graph and Twitter tags.
* Structured data: `Organization` (layout), `Product` + `FAQPage` (product pages),
  `Article` (blog posts), `LocalBusiness` (location pages), `BreadcrumbList`
  (every breadcrumb), `FAQPage` (category and service FAQs).
* `app/robots.js` reproduces the current robots.txt rules; XML sitemaps remain
  served by the existing backend.

## Not in scope for this phase

The SQL database is untouched — no migration, no MongoDB, no backend rewrite.
This phase delivers the frontend only, structured so the existing backend can be
connected next without rebuilding the UI.

## Database (existing SQL)

The app reads the **existing** DoctorFresh MySQL database. It is read-only —
no migrations, no schema changes, no writes.

1. `cp .env.example .env.local` and fill in `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
2. `node _audit/introspect-db.js` — prints the real tables/columns and writes
   `_audit/db-schema.json`.
3. Reconcile any name differences in `lib/sql/schema.js` (that is the only file
   that knows table/column names).
4. `npm run dev`, then open `/api/health` — `"source": "sql"` means the site is
   being served from the database.

Without credentials, or if the database is unreachable, every catalog function
falls back to the extracted data in `data/` and the site keeps working.

| File | Role |
| --- | --- |
| `lib/db.js` | connection pool, `query()`, `ping()` |
| `lib/sql/schema.js` | table + column names (edit here) |
| `lib/sql/map.js` | SQL rows → the shape the UI already uses |
| `lib/sql/repository.js` | the queries, memoised for the build |
| `lib/catalog.js` | what pages call; SQL-or-static, unchanged API |
| `lib/sql/media.js` | resolves image names against the files in `public/uploads` |

### Images

All catalogue media is served by this app from `public/uploads` (product photos,
blog images, banners), so `next/image` optimises it and nothing is fetched from
the old host at runtime. The database only records how many images a product
has, not their filenames, and the admin panel numbering is not always 1-based —
so `lib/sql/media.js` indexes the upload directories and uses the real names.
Set `DB_UPLOADS_BASE_URL` to a CDN or absolute URL if the media ever moves off
the app. Structured data (JSON-LD, OG tags) still emits absolute URLs via
`absoluteUrl()`, which is what crawlers need.
