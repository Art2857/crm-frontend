# CRM Frontend

Frontend для CRM-системы на Next.js.

## Что делает сервис
- Авторизация и проверка сессии.
- Dashboard CRM.
- Просмотр и создание работ.
- Учёт и просмотр платежей.
- Раздел курсов валют.
- Профиль пользователя.
- Админские разделы пользователей и обязанностей.
- Разделы аккаунтов и возврата средств.

## Стек
- Node.js 22+
- Next.js 14
- React 18
- TypeScript
- Redux Toolkit

## Порты по умолчанию
- Frontend: `3000`
- CRM API: `3001`

## Переменные окружения
- Шаблон: `.env.example`
- Локальный файл: `.env`

Ключевые переменные:
- `NEXT_PUBLIC_API_URL` — URL CRM backend, по умолчанию `http://localhost:3001/api`.
- `NEXT_PUBLIC_APP_VERSION` — версия приложения для health-check.
- `NEXT_PUBLIC_IGNORE_SSL` — отключение проверки SSL в dev при необходимости.

## Быстрый старт
```bash
npm ci
npm run dev
```

Приложение будет доступно на `http://localhost:3000`.

## Запуск через Docker Compose
```bash
docker compose -f docker/compose.dev.yml up -d
```

## Полезные команды
```bash
npm run dev
npm run build
npm run start
npm run lint
npm run lint:fix
npm run typecheck
```

## Зависимости
- Для полноценной работы нужен `crm-backend` на `http://localhost:3001`.
