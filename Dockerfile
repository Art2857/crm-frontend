# Используем официальный Node.js образ как базовый
FROM node:18-alpine AS base

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Этап установки зависимостей
FROM base AS deps

# Устанавливаем зависимости
RUN npm ci --only=production && npm cache clean --force

# Этап сборки
FROM base AS builder

# Устанавливаем все зависимости (включая dev)
RUN npm ci

# Копируем исходный код
COPY . .

# ВАЖНО: Устанавливаем переменные окружения ДО сборки
# Dokploy автоматически передаст переменные как build args
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_VERSION

# Экспортируем как переменные окружения для сборки
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION

# Устанавливаем переменные окружения для сборки
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Собираем приложение
RUN npm run build

# Production этап
FROM node:18-alpine AS production

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app

# Устанавливаем необходимые системные зависимости
RUN apk add --no-cache dumb-init

# Копируем production зависимости
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Копируем собранное приложение
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./

# Создаем директорию .next/cache с правильными правами
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next/cache

# Переключаемся на пользователя nextjs
USER nextjs

# Открываем порт
EXPOSE 3000

# Устанавливаем переменные окружения
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Проверка здоровья
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Запускаем приложение
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"] 
