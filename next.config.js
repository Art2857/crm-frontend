/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Отключаем ESLint во время сборки
    ignoreDuringBuilds: true,
    dirs: []
  },
  typescript: {
    // Разрешаем сборку с ошибками TypeScript в продакшене
    ignoreBuildErrors: false,
  },
  images: {
    domains: ['localhost'],
    unoptimized: true
  },
  experimental: {
    serverComponentsExternalPackages: []
  }
}

module.exports = nextConfig