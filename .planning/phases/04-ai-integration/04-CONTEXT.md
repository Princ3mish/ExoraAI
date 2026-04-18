# Phase 4: AI Integration - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Source:** PRD Express Path (User Request)

<domain>
## Phase Boundary

Implement Phase 4 (AI Integration) as a full-scale intelligence layer on top of the existing production-ready Express.js + Prisma backend. This introduces a robust, extensible AI subsystem adhering to the current architecture (routes → controllers → services) while elevating the system from rule-based scheduling to intelligent decision support.
</domain>

<decisions>
## Implementation Decisions

### AI Service Module
- Create `services/ai.service.js`, `services/providers/groq.provider.js`, `services/providers/openrouter.provider.js`, and `utils/ai.prompts.js`.
- Separate prompt construction, provider communication, and orchestration logic.
- Core entry point: `generateCompletion({ taskType, input, metadata })`.
- Provider priority: Groq (primary for throughput) with fallback to OpenRouter on failures (429, network issues, invalid responses).
- Implement retry logic with exponential backoff and circuit-breaking.
- Wrap AI calls in structured Winston logging with metadata (userId, meetingId, endpoint, latency, provider used, tokens) with truncated prompt/response bodies.

### Prompt Template System
- Stored in `utils/ai.prompts.js`.
- Categories: `SUGGEST_TIMES`, `DRAFT_EMAIL`, `SUMMARIZE_MEETING`.
- Deterministic, structured, versionable (e.g. `v1`).
- `SUGGEST_TIMES` takes normalized array of ISO timestamps grouped per user and enforces strict formatted JSON output. E.g., `{ "suggestions": [{ "start": "...", "end": "...", "score": 0.9 }] }`. Schema validation enforced on responses.
- Implement a deterministic pre-processing layer in the AI service that filters availability using existing business logic before invoking AI.

### API Endpoints (under `/api/ai`)
- Require Zod validation and proper RBAC.
- `GET /api/ai/suggest-times` (admin-only): aggregates participant availability from Prisma, normalizes, calls AI service, returns ranked slots.
- `POST /api/ai/draft-email` (admin-only): `{ meetingId, contextType }`, fetches meeting + participant data, generates email body.
- `POST /api/ai/summary` (admin or user): `{ meetingId, notes }`, returns structured summaries.
- Controllers remain thin (validation, authentication, delegation). All AI logic is inside the service layer.

### Error Handling & Resilience
- Unified internal error types mapping provider-specific errors.
- Graceful degradation (fallback, cached responses, or structured errors).
- 503/429 thrown if both providers fail. No raw provider errors exposed.
- Optional in-memory LRU caching for repeated prompts (like email drafts).
- Timeout guards (5-10 seconds) per AI call.

### Testing
- Extend Jest + Supertest suite.
- Mock AI providers (no real API calls).
- Cover success, provider fallback, malformed output, rate-limits, and timeouts.
- Validate consistent schemas and correct HTTP statuses.
- Integration tests simulating full flows (create meeting -> call suggest-times).

### Extensibility
- Plug-and-play module design.
- Allow adding new providers, prompt types, or logic without modifying controllers.
- Generate AI outputs only, no external integrations (email/SMS/voice) yet.
</decisions>
