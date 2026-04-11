# CRM Frontend

Next.js frontend для CRM-системы.

## Требования

- Node.js `24.14.1` (LTS)
- npm `11+`
- `crm-backend` на `http://localhost:3001`

## Порты по умолчанию

- Frontend: `3000`
- CRM API: `3001`

## Окружение

- Шаблон переменных: `.env.example`
- Локальная конфигурация: `.env`
- Ключевые переменные: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_IGNORE_SSL`

## Быстрый старт

```bash
npm ci
npm run dev
```

Frontend: `http://localhost:3000`

## Docker dev

```bash
docker compose -f docker/compose.dev.yml up -d
```

## Ключевые команды

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run lint:fix
npm run format
npm run typecheck
npm run check
```

## Quality Gates

- `pre-commit`: `lint-staged`
- `commit-msg`: `commitlint`
- Полный локальный прогон: `npm run check`
