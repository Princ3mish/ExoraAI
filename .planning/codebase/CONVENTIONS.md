# Coding Conventions

## General
- **Monorepo Style**: The project uses a simple monorepo structure, cleanly split into `frontend` and `backend` directories.

## Frontend
- **Languages/Frameworks**: TypeScript (`.ts`/`.tsx`) is strictly used for logic and components.
- **Styling**: Tailwind CSS utility classes are heavily preferred over custom CSS files. `clsx` and `tailwind-merge` are utilized for conditionally joining classes safely.
- **Imports**: ES Modules format.
- **UI Architecture**: A standard Shadcn UI structure is suggested by the presence of `components/ui/` and `lib/utils` setup.

## Backend
- **Languages/Frameworks**: Pure JavaScript is used (ES modules syntax, `type: "module"` in package.json).
- **Logging**: Use the internal `Winston` logger wrapper located in `src/utils/logger.js` instead of standard `console.log`.
- **Error Handling**: Use the centralized global error handler via Express middleware `src/middleware/errorHandler.js` instead of ad-hoc scattered catch blocks sending direct responses.
- **Environment Management**: Configuration and environmental variables are encapsulated in `src/config/env.js`.
