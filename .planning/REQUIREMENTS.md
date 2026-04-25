# Exora AI — Requirements

## Core Requirements

### REQ-001: Project Setup
Full-stack repository with backend (Express) and frontend (React/Vite) directories, Git workflow, and README.

### REQ-002: Database & Architecture
Prisma schema with User, Meeting, Participant, Availability models. Modular Express architecture. Winston logging. Global error handler.

### REQ-003: Authentication
JWT-based auth (register/login), bcrypt password hashing, auth middleware, role-based access control (ADMIN/USER).

### REQ-004: Meeting Management
Meeting CRUD, participant invitations, status transitions (PENDING/ACCEPTED/REJECTED), conflict detection.

### REQ-005: AI Time Suggestion
AI-ranked meeting time suggestions using participant availability. Groq primary, OpenRouter fallback.

### REQ-006: AI Email & Summary
AI draft email generation (invite/reminder/follow-up). AI meeting summary from notes.

### REQ-007: Frontend Auth & Navigation
Login/Register pages. Role-aware routing. Protected routes. Session persistence.

### REQ-008: Frontend Dashboards & AI UI
Admin dashboard (create meeting, manage participants). User dashboard (respond to invites). AI suggestion/draft/summary components embedded in meeting detail.

## Phase 6 Requirements

### REQ-009: AI Action Log (Backend)
Centralized `AIEvent` Prisma model persisting every important action (meeting created, AI email generated, email sent, user responded, simulation triggered, failures). Fields: id, type, message, status, meetingId, userId, metadata (JSON), createdAt. All services write structured logs to this table.

### REQ-010: Real-Time Event Delivery
Polling endpoint `GET /api/events` returns recent AIEvent records. Frontend polls every 3–5 seconds. Backend structured so SSE migration path is clear.

### REQ-011: AI Assistant Panel (Frontend)
Chat/timeline hybrid UI consuming `/api/events`. Renders events sequentially with type differentiation (AI_ACTION, SYSTEM, USER_RESPONSE, ERROR), timestamps, and status indicators (success/pending/failed). Acts as "brain visualization."

### REQ-012: Real Email Sending
Nodemailer (Gmail SMTP) email service (`email.service.js`). Sends actual emails on meeting create/update. Async, non-blocking. Logs success/failure to AIEvent table. `EMAIL_USER`/`EMAIL_PASS` env vars. Graceful fallback (never crash on email fail).

### REQ-013: Voice Simulation
Frontend-only voice simulation. "Call Participant" button triggers: log "Calling X…", simulate delay, call AI to generate conversational script (both sides), display step-by-step in AI panel. Structured for future Web Speech API / Twilio integration.

### REQ-014: Failure Handling & Observability
All external dependencies have retries/fallbacks. Failures visible in logs AND UI (not silent). Frontend degrades gracefully (retry buttons, refresh options). Winston extended for email events, AI actions, simulation steps. Consistency between backend logs and AI panel events.
