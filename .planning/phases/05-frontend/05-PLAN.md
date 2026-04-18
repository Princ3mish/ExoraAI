---
wave: 1
depends_on: []
files_modified: []
autonomous: false
---

# Phase 05: Frontend Initialization and Core SaaS Foundation

<task>
<read_first>
- .planning/phases/05-frontend/05-CONTEXT.md
</read_first>

<action>
Bootstrap the React Frontend using Vite in a new `frontend/` directory if it does not exist.
1. Change into the root directory.
2. If `frontend/` does not exist, run `npm create vite@latest frontend -- --template react`.
3. CD into `frontend/` and run `npm install`.
4. Install critical base dependencies: `npm install react-router-dom axios framer-motion lucide-react clsx tailwind-merge`.
5. Install development tools: `npm install -D tailwindcss postcss autoprefixer`.
6. Initialize tailwind via `npx tailwindcss init -p`.
7. Configure `frontend/tailwind.config.js` with content array matching `["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]`.
8. Overwrite `frontend/src/index.css` to include the standard Tailwind base directives (`@tailwind base; @tailwind components; @tailwind utilities;`).
9. Clean up boilerplate: clear out `App.jsx` and delete `App.css` and `assets/react.svg`.
</action>

<acceptance_criteria>
- `frontend/package.json` exists with installed dependencies.
- `frontend/tailwind.config.js` contains paths for standard React code.
- `frontend/src/index.css` contains Tailwind directives.
</acceptance_criteria>
</task>

<task>
<read_first>
- frontend/package.json
</read_first>

<action>
Set up Shadcn UI locally with a few baseline components.
1. In `frontend/`, run `npx shadcn-ui@latest init -y` making sure to pick default styling (Zinc or Slate) and placing components inside `src/components/ui`.
2. Generate essential components via `npx shadcn-ui@latest add button card input label form use-toast toast toaster separator skeleton`.
3. Create a central architecture loop by ensuring directories exist: `mkdir -p frontend/src/{api,components/{layout,shared},pages,hooks,context,routes,utils}`.
</action>

<acceptance_criteria>
- `frontend/components.json` is generated successfully.
- Baseline ShadCN components exist in `frontend/src/components/ui/button.jsx` (or `.tsx`).
- Standard directories exist inside `frontend/src/`.
</acceptance_criteria>
</task>

<task>
<read_first>
- frontend/src/api/
- frontend/src/context/
</read_first>

<action>
Implement Centralized API Wrapper & Authentication Context.
1. Create `frontend/src/api/client.js`. Export an `apiClient` instance of `axios.create({ baseURL: 'http://localhost:3000/api' })`.
2. Add a request interceptor to `apiClient` mapping `localStorage.getItem('token')` strictly to the `Authorization: Bearer <token>` header.
3. Add a response interceptor catching `401 Unauthorized`. If triggered, strip the token and fire a custom browser Window event (e.g., `window.dispatchEvent(new Event('auth_unauthorized'))`).
4. Create `frontend/src/context/AuthContext.jsx`.
   - Manage state for `user` and `loading`.
   - On mount, check if token exists. If it does, call `/api/auth/me` (assume it exists or just parse standard JWT / user payload).
   - Listen to the `auth_unauthorized` window event; clear context state and token if heard.
   - Expose `login(data)`, `register(data)`, and `logout()` functions pointing to `/api/auth`.
</action>

<acceptance_criteria>
- `frontend/src/api/client.js` exports an Axios wrapper injecting JWT tokens and intercepting 401 statuses.
- `frontend/src/context/AuthContext.jsx` exists, providing global authentication states (`user`, `login`, `logout`).
</acceptance_criteria>
</task>

<task>
<read_first>
- frontend/src/App.jsx
- frontend/src/context/AuthContext.jsx
</read_first>

<action>
Establish React Router Architecture & Root Routes.
1. Create `frontend/src/routes/AppRoutes.jsx`.
2. Configure basic pathways:
   - `/` defaults to redirection to `/dashboard` if authenticated, else `/login`.
   - `/login` maps to a placeholder `LoginPage`.
   - `/register` maps to a placeholder `RegisterPage`.
   - `/dashboard` maps to a ProtectedRoute component resolving a `DashboardLayout`.
3. Create `frontend/src/routes/ProtectedRoute.jsx` verifying the `user` object from `AuthContext` and re-routing to `/login` if null.
4. Mount `AppRoutes` and `AuthProvider` in `frontend/src/App.jsx`.
</action>

<acceptance_criteria>
- `frontend/src/routes/AppRoutes.jsx` routes auth logic logically.
- `frontend/src/App.jsx` is wrapped in `AuthProvider` and `BrowserRouter`.
</acceptance_criteria>
</task>

---

## Plan Breakpoints
Due to context length, subsequent Waves (Auth Pages, Layout Shells, Admin Features, AI Integration) should be generated as secondary plan files in this directory. Review Wave 1 first to guarantee project structural integrity before continuing.
