# Phase 5: Frontend - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning
**Source:** User Prompt (PRD Express Path)

<domain>
## Phase Boundary

This phase delivers the complete frontend for the AI Meeting Orchestration Assistant using React (Vite), Tailwind CSS, ShadCN UI, and Framer Motion. It bridges the gap between the existing Express.js/Prisma AI backend and the end-user by providing an authentic, robust, and mobile-first SaaS experience.
</domain>

<decisions>
## Implementation Decisions

### Tech Stack
- React (bootstrapped with Vite)
- Styling: Tailwind CSS
- UI Framework: ShadCN UI
- Animations: Framer Motion
- State & Data: `axios` wrapper for API requests, React Context for Auth State.

### Architecture & Directories
- Structure: `frontend/src/{api, components, pages, hooks, context, routes, utils}/`
- Centralized API layer that natively attaches JWT tokens.
- Global request interceptor handling 401s (automatic session logout/redirect).

### Routing & Views
- Public Pages: Login, Register.
- Protected Layout: Dashboard shell with Sidebar navigation and Header (User info + Logout).
- Role-based Routing branches (ADMIN vs USER logic).

### Features - Admin
- Meeting creation (Form: Title, Time, Participant checkboxes).
- List of meetings with current participant statuses.
- Integration with AI endpoints (Suggest times, draft emails, summarize).
- Displaying AI responses structurally (cards, bullet points) rather than raw blocks.

### Features - User
- Dashboard with meeting invitations.
- Accept / Reject actions.
- Schedule / Timeline view.

### UI/UX Rules
- Extensive use of Skeleton Loaders during network fetches.
- Friendly Empty States for zero-data conditions.
- Error Toast/Banner handling system.
- Animations on page transitions, sidebar sliding, button hovers.
- Clean design: rounded components, soft shadow, modern aesthetics, responsive layouts (tables convert to cards on mobile).
</decisions>
