/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
};

module.exports = nextConfig;