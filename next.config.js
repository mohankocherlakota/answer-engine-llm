/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Prevent webpack from bundling these packages that use ESM features
    // (private class fields) incompatible with Next.js 14 webpack bundler
    serverComponentsExternalPackages: ['cheerio', 'undici'],
  },
};

module.exports = nextConfig;
