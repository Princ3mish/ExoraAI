# Architecture

## Overall System Architecture
Exora AI is a full-stack web application implementing a standard decoupled client-server architecture.
- **Frontend App**: Single Page Application (SPA) built with React and Vite. Communicates with backend via REST.
- **Backend API**: RESTful API service built with Express.js, providing business logic and database access.
- **Database Layer**: PostgreSQL accessed entirely through the Prisma ORM.

## Backend Architecture
- **Entry Points**: `src/server.js` manages DB connection and server listen loop. `src/app.js` is the Express app definition.
- **Modular Pattern**: Features appear to be organized within `src/modules/` (e.g., `health/`).
- **Middleware**: Standard Express middleware pattern used (`src/middleware/`), including a centralized global error handler.
- **Data Access**: Centralized database interactions via Prisma schemas.

## Frontend Architecture
- **Component-Driven**: Utilizes React's functional components.
- **Styling**: Utility-first pattern with Tailwind CSS.
- **Utility Layer**: `src/lib/` (specifically `utils.ts` with `clsx` and `tailwind-merge`) facilitates dynamic class generation typical of modern accessible component libraries.
