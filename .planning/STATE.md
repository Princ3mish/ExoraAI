# Exora AI — Project State

## Current Status
**Active Phase:** 6 — Autonomous Orchestration & Real-Time Features
**Status:** Planning
**Last Activity:** 2026-04-25

## Completed Phases
- ✅ Phase 1: Project Setup & Infrastructure
- ✅ Phase 2: Database & Core Architecture
- ✅ Phase 3: Core Features (MVP Logic)
- ✅ Phase 4: AI Integration
- ✅ Phase 5: Frontend

## Key Architecture Decisions

### Backend
- **Framework:** Express 5.2.1 (ES Modules)
- **Database ORM:** Prisma 5.22.0 + PostgreSQL
- **AI:** Groq (primary) → OpenRouter (fallback) with retry + circuit-breaking
- **Logging:** Winston (structured, metadata-rich)
- **Auth:** JWT + bcrypt, RBAC middleware

### Frontend
- **Framework:** React 19.2 + Vite + TypeScript
- **UI:** ShadCN UI + Tailwind CSS + Framer Motion
- **State:** React Context (AuthContext)
- **API:** Axios wrapper with JWT injection

### Established Patterns
- Routes → Controllers → Services layering (strict)
- Zod validation at controller layer
- Winston structured logging with metadata
- Provider fallback pattern (Groq → OpenRouter)
- Async non-blocking for all external calls

## Phase 6 Decisions (Locked)
- AIEvent Prisma model as central event backbone
- Polling (3–5s) for real-time delivery (SSE-ready structure)
- Nodemailer Gmail SMTP for real email sending
- Voice simulation: frontend-only, AI-generated script
- All failures logged to AIEvent AND surfaced in AI Assistant Panel UI
