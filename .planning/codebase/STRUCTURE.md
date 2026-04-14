# Codebase Structure

## Repository Root
- `/frontend`: Client-side React application.
- `/backend`: Server-side Node.js application.
- `README.md`: Project documentation.

## Frontend (`/frontend`)
- `src/`: Main source code root.
  - `components/`: UI components directory (includes `ui/` subdirectory for atomic components).
  - `lib/`: Utility functions and library wrappers (e.g., `utils.ts`).
  - `assets/`: Static assets for the build process.
  - `App.tsx`: Root React component.
  - `main.tsx`: Client entry point.
- `index.html`: Vite HTML template.
- `package.json`, `vite.config.ts`, `tailwind.config.js`, `tsconfig.json`: Project and tooling configs.

## Backend (`/backend`)
- `src/`: Main source code root.
  - `server.js`: Application bootstrap and server listeners.
  - `app.js`: Express application configuration and route definitions.
  - `config/`: Environment and app configuration.
  - `middleware/`: Custom Express middleware.
  - `modules/`: Domain/logic breakdown (e.g., `health`).
  - `utils/`: General utilities (e.g., `logger.js`).
- `prisma/`: Prisma ORM schema and migrations.
  - `schema.prisma`: Core database schema definition.
- `.env`: Environment variables (local).
- `package.json`, `eslint.config.js`: Project and tooling configs.
