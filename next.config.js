/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The stylesheet (about 20 KB compressed) goes into each page's HTML instead
  // of separate files the browser must fetch before it can paint anything.
  experimental: {
    inlineCss: true,
  },
  // A second dev server (for testing) can build into its own folder.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),

  // The database is on a remote host whose link speed swings widely. On a slow
  // minute a page can take longer than Next's default 60 seconds to render,
  // and three such attempts fail the whole deploy; this gives it room.
  staticPageGenerationTimeout: 180,
  outputFileTracingRoot: __dirname,

  images: {
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
