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
