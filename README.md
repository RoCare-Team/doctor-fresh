# DoctorFresh — Next.js frontend

Rebuild of [www.doctorfresh.in](https://www.doctorfresh.in) on Next.js (App
Router), React and plain JavaScript/JSX. Every URL, product, page and piece of
copy is preserved; the UI is redesigned and the content comes from the site's
existing MySQL database.

## Stack

| | |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| Language | JavaScript + JSX — no TypeScript, no `.tsx` |
| Styling | Tailwind CSS v4 + design tokens in `app/globals.css` |
| Icons | `lucide-react` |
| Database | `mysql2` against the existing `dotindoc_website` schema |

## Getting started

```bash
npm install
cp .env.example .env.local     # fill in DB_*, AUTH_SECRET, OTP_TOKEN
npm run dev                    # http://localhost:3000
npm run build && npm start
```

`/api/health` reports whether the database is reachable and how many rows it is
serving.

## Where the content comes from

Nothing is hardcoded or duplicated — the app reads the same tables the PHP site
reads:

| Content | Tables |
| --- | --- |
| Products, prices, specs, reviews | `product`, `attribute`, `attribute_filter`, `product_reviews` |
| Categories and subcategories | `category`, `sub_category` |
| Blog | `blog`, `blog_category` |
| The 22,195 flat SEO URLs | `landing_pages` |
| Brand, footer, policies, slides | `general_settings`, `social_links`, `slides` |
| Accounts | `user` |
| Orders | `sale`, `stock`, `payment_transactions` |

**Pages never query the database directly.** Everything goes through
`lib/catalog.js`, which throws if the database cannot answer rather than
serving something invented. Next.js keeps the last successfully rendered page,
so a brief outage shows the previous real content.

| File | Role |
| --- | --- |
| `lib/db.js` | pool, `query()`, `mutate()`, `ping()` |
| `lib/sql/schema.js` | table + column names — the only file that knows them |
| `lib/sql/map.js` | SQL rows → the shape the UI uses |
| `lib/sql/repository.js` | catalogue queries, memoised |
| `lib/sql/landing.js` | the SEO/location pages |
| `lib/sql/site.js` | settings, social links, policies, slides |
| `lib/sql/orders.js` | pricing, order creation, stock |
| `lib/sql/easebuzz.js` | online payment |
| `lib/sql/media.js` | resolves image names against `public/uploads` |
| `lib/catalog.js` | what pages call |

`data/site.js` is what is left of the old data layer: layout copy the database
does not hold (trust badges, the water-test panel, form field lists, store
addresses). No product, price, page or customer data.

> The MySQL account is shared with the live PHP site and capped at 30
> connections, so the pool is deliberately small (`DB_CONNECTION_LIMIT=3`),
> retries back off, and queries are batched per family rather than per page.

## Images

All media is served from `public/uploads`, so `next/image` optimises it and
nothing is fetched from the old host at runtime. The database records how many
images a product has but not their filenames, and the numbering is not always
1-based — `lib/sql/media.js` indexes the directories and uses the real names.
Set `DB_UPLOADS_BASE_URL` to move media to a CDN. Structured data still emits
absolute URLs via `absoluteUrl()`.

## Sign-in (mobile + OTP)

Accounts live in the site's existing `user` table — an account created here is
the same account the PHP site knows. No column was added.

Codes are issued, sent and checked by the shared RO Care OTP service
(`roservice_sendotp.php` / `service_otp_verify.php`). The code never reaches
this app, so there is nothing here to store or leak.

`OTP_TOKEN` is **server-side only**. The send endpoint refuses a request
without the `X-App-Token` header, so exposing it through a `NEXT_PUBLIC_`
variable would let anyone send messages from your account.

Both endpoints answer HTTP 200 whatever happens and put the verdict in the
`error` field, so the body is what is trusted. Rate limiting — one code a
minute, five an hour, five wrong attempts — is applied here; the service does
not do it.

The session is a signed httpOnly cookie (30 days). Set **`AUTH_SECRET`** in
production: sign-in refuses to work without it rather than using a guessable key.

## Checkout

Three steps, matching the current site: review the order, delivery address,
payment. Payment methods are the ones switched on in `business_settings`.

Every number — price, GST, shipping, coupon discount — is calculated on the
server from the catalogue. The browser only ever sends product ids and
quantities, so a tampered price cannot reach an order.

* **Cash on delivery** completes immediately and takes the stock.
* **Online payment** posts to the site's existing `easebuzz.php`, which holds
  the merchant credentials, and sends the visitor to the hosted page. Stock is
  only taken once the gateway confirms the payment — an abandoned payment must
  not hold stock.

Orders are written to `sale` with the same `payment_status` / `delivery_status`
shapes the PHP checkout writes, plus a `stock` movement per line, so they
appear in the existing admin panel.

## URL compatibility

Every existing URL is preserved — see
**[`_audit/ROUTES.md`](_audit/ROUTES.md)**. Legacy `.php` URLs issue the same
301s the live site serves, and the older legal-page spellings
(`/legal/terms-conditions`, `/legal/privacy-policy`, `/legal/return_policy`)
still resolve.

`PRERENDER_PER_FAMILY` (default 40) controls how many city pages per service
family are built up front; the rest render on demand and are then cached. A
slug with no published row renders the not-found page, which is what the live
site does with an unknown slug.

## Rendering

Server Components by default. `"use client"` is limited to genuinely
interactive parts: header menus, mobile drawer, product gallery and tabs,
category filters, cart, checkout, accordions and forms.

The header reads the session from `/api/auth/me` in the browser rather than
from the layout: touching `cookies()` in a server component would opt the whole
tree out of static rendering and turn all 706 prerendered pages into
per-request renders.

## SEO

* Per-route title, description, canonical, robots, Open Graph and Twitter tags.
* Structured data: `Organization`, `Product` + `FAQPage`, `Article`,
  `LocalBusiness`, `BreadcrumbList`.
* `NEXT_PUBLIC_SITE_INDEXABLE=false` keeps staging out of search results;
  set it to `true` in production.

## Still to do

* Contact, newsletter, service booking and callback forms are not yet written
  to `contact_message`, `subscribe`, `leads` and `request_call_back`.
* No order history page for signed-in customers.
* Blog comments (`comment`, `comment_reply`) are not shown.
* The WhatsApp order notification the PHP checkout sends is not wired up.

## `_audit/`

The original crawl of the live site, the extractors that produced the first
data layer, `introspect-db.js` (prints the real schema) and
`ROUTES.md` (the URL inventory and verification results).
