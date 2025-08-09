/** @type {import('next').NextConfig} */
const nextConfig = {
  // Основные настройки
  poweredByHeader: false,
  reactStrictMode: true,

  // Оптимизация для Docker
  output: 'standalone',

  // Отключаем проверку ESLint во время сборки (только для деплоя)
  eslint: {
    ignoreDuringBuilds: false, // можно поставить true для быстрого деплоя
  },

  // Настройки сборки
  webpack: (config, { isServer }) => {
    // Оптимизации для production
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    return config;
  },

  // Настройки для Dokploy/Docker
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
