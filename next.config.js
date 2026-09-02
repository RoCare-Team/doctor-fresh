/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.doctorfresh.in' },
      { protocol: 'https', hostname: 'doctorfresh.in' },
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
      { source: '/partner.php', destination: '/partner', permanent: true },
      { source: '/store-locator.php', destination: '/store-locator', permanent: true },
      { source: '/water-purifier-service.php', destination: '/water-purifier-service', permanent: true },
      { source: '/category/0/0-0', destination: '/all-category', permanent: true },
    ];
  },
};

module.exports = nextConfig;
