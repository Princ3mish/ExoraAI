# Exora AI — Project Roadmap

## Milestone 1: AI Meeting Orchestration MVP

### Phase 1: Project Setup & Infrastructure
**Goal:** Initialize full-stack project structure with Git workflow, backend scaffold, and database foundation.
**Status:** ✅ Completed
**Requirements:** REQ-001

### Phase 2: Database & Core Architecture
**Goal:** Design and implement Prisma data models, modular Express architecture, structured Winston logging, and global error handling.
**Status:** ✅ Completed
**Requirements:** REQ-002

### Phase 3: Core Features (MVP Logic)
**Goal:** Implement auth (JWT + bcrypt), RBAC middleware, meeting lifecycle management (CRUD), and participant response workflows.
**Status:** ✅ Completed
**Requirements:** REQ-003, REQ-004

### Phase 4: AI Integration
**Goal:** Introduce Groq/OpenRouter AI service with provider fallback, caching, and three endpoints: suggest-times, draft-email, summary.
**Status:** ✅ Completed
**Requirements:** REQ-005, REQ-006

### Phase 5: Frontend
**Goal:** Build full React + TypeScript + ShadCN frontend with auth flows, admin/user dashboards, meeting management, and AI component integrations.
**Status:** ✅ Completed
**Requirements:** REQ-007, REQ-008

### Phase 6: Autonomous Orchestration & Real-Time Features
**Goal:** Transform the app from CRUD+AI tool into an active orchestration system — AI Action Log, real email sending via Nodemailer, real-time polling UI, voice simulation, and robust failure handling with observability.
**Status:** 🔄 In Progress
**Requirements:** REQ-009, REQ-010, REQ-011, REQ-012, REQ-013
