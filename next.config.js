/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /**
   * The stylesheet is a file, not inlined into every page.
   *
   * Inlined, it cost 21 KB on the home page twice over — once in the page and
   * again in the data the page ships with — on every visit to every one of
   * 22,000 pages. As a file it is fetched once and then cached for the whole
   * site, and the page itself arrives 40 KB lighter.
   */
  experimental: {
    inlineCss: false,
  },

  /**
   * Next ships polyfills for Array.at/flat/flatMap, Object.fromEntries/hasOwn
   * and String.trimStart/trimEnd to every browser. Every browser the site
   * supports (browserslist in package.json: Chrome/Edge 93+, Safari 15.4+,
   * Firefox 92+) has them built in, so the ~11 KB is left out of the bundle.
   */
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '../build/polyfills/polyfill-module': false,
        'next/dist/build/polyfills/polyfill-module': false,
        [require.resolve('next/dist/build/polyfills/polyfill-module')]: false,
      };
    }
    return config;
  },
  // A second dev server (for testing) can build into its own folder.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),

  // The database is on a remote host whose link speed swings widely. On a slow
  // minute a page can take longer than Next's default 60 seconds to render,
  // and three such attempts fail the whole deploy; this gives it room.
  staticPageGenerationTimeout: 180,
  outputFileTracingRoot: __dirname,

  images: {
    // AVIF where the browser takes it (a third to half smaller than WebP at
    // the same look), WebP otherwise.
    formats: ['image/avif', 'image/webp'],
    /**
     * Every picture on a page carries the full list of sizes it could be
     * served at, once in the HTML and again in the data the page ships with.
     * The home page holds over a thousand of those lines, which cost more to
     * download than the few kilobytes a perfectly matched width would save —
     * so the list is short: four widths for full-width pictures, four for
     * fixed-size ones. A phone may now fetch a picture a little wider than it
     * strictly needs, and in return the page itself arrives sooner.
     */
    deviceSizes: [640, 828, 1080, 1920],
    imageSizes: [64, 128, 256, 384],
    remotePatterns: [
      { protocol: 'https', hostname: 'www.doctorfresh.in' },
      { protocol: 'https', hostname: 'doctorfresh.in' },
      // Photos uploaded from the admin, stored in Vercel Blob.
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
    ],
  },

  /**
   * Preview and staging deployments answer on *.vercel.app. That host must
   * never be indexed — it would put a second copy of all 22,000 pages in
   * front of Google, competing with doctorfresh.in itself.
   *
   * This is deliberately independent of NEXT_PUBLIC_SITE_INDEXABLE: once that
   * switch is turned on for the real domain, the same build still answers on
   * its .vercel.app URL, and only the host tells the two apart.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: '(?<deployment>.*)\\.vercel\\.app' }],
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },

  // The live site 301-redirects these legacy .php URLs. Keeping the same
  // behaviour means every existing inbound link still resolves.
  async redirects() {
    return [
      /**
       * Every page of the PHP site answered at /slug.php and this one serves
       * the same page at /slug. Google has years of those URLs indexed and
       * other sites link to them, so each one is sent on permanently rather
       * than answering 404 and losing what it earned.
       *
       * The links in our own copy are rewritten where they are read
       * (lib/sql/html.js), so this catches inbound traffic, not our own pages.
       */
      { source: '/:slug.php', destination: '/:slug', permanent: true },
      { source: '/category/0/0-0', destination: '/all-category', permanent: true },
    ];
  },
};

module.exports = nextConfig;
