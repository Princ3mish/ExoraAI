---
phase: 4
wave: 1
depends_on: [3]
files_modified:
  - backend/src/services/providers/groq.provider.js
  - backend/src/services/providers/openrouter.provider.js
  - backend/src/utils/ai.prompts.js
  - backend/src/services/ai.service.js
  - backend/src/api/ai/ai.schema.js
  - backend/src/api/ai/ai.controller.js
  - backend/src/api/ai/ai.routes.js
  - backend/src/app.js
  - backend/test/api/ai.test.js
autonomous: true
---

# Phase 4: AI Integration Plan

## Task 1: Prompt Template System and AI Utilities
<task>
<read_first>
- backend/src/utils/logger.js
</read_first>
<action>
Create `backend/src/utils/ai.prompts.js` to manage versioned prompt templates for the AI features.
Include predefined prompt generators for task types `SUGGEST_TIMES`, `DRAFT_EMAIL`, and `SUMMARIZE_MEETING`:
- `SUGGEST_TIMES`: Take normalized availability data (array of ISO timestamps grouped per user) and output strictly formatted JSON string `{ "suggestions": [{ "start": "...", "end": "...", "score": ... }] }`. Include version tags (e.g., v1).
- `DRAFT_EMAIL`: Accept { meetingId, contextType } (invite/reminder/follow-up) and meeting context, outputting polished text. Include version tags (e.g., v1).
- `SUMMARIZE_MEETING`: Accept { meetingId, notes } and output structured summary with bullet points, action items, decisions. Include version tags (e.g., v1).

Also, install `lru-cache` via `npm install lru-cache` to add a basic memory cache utility for repeated prompt outputs. Modify package.json by running `npm install lru-cache` in the backend directory.
</action>
<acceptance_criteria>
- `backend/src/utils/ai.prompts.js` exports `SUGGEST_TIMES_V1`, `DRAFT_EMAIL_V1`, `SUMMARIZE_MEETING_V1` functions or templates.
- Ensure Zod or JSON schemas are explicitly required in the AI prompts.
- `package.json` contains `lru-cache`.
</acceptance_criteria>
</task>

## Task 2: AI Provider Wrapper Core Logic
<task>
<read_first>
- backend/src/utils/logger.js
</read_first>
<action>
Create `backend/src/services/providers/groq.provider.js` and `backend/src/services/providers/openrouter.provider.js`.
Both should export a class or functions with a consistent interface: `async function generateCompletion(prompt, systemInstruction)`.
Add timeout guards (5-10 seconds per AI call) inside the provider wrappers.
If rate limits (HTTP 429), network issues, or invalid responses happen, they should throw a specific error type (e.g., `ProviderError`) with specific metadata. (Do not expose raw error properties to the user).
Map provider-specific errors to unified internal types. 
</action>
<acceptance_criteria>
- `backend/src/services/providers/groq.provider.js` exists and handles timeout logic.
- `backend/src/services/providers/openrouter.provider.js` exists and handles timeout logic.
- Provider code isolates API keys (`process.env.GROQ_API_KEY`, `process.env.OPENROUTER_API_KEY`).
</acceptance_criteria>
</task>

## Task 3: AI Orchestrator Service
<task>
<read_first>
- backend/src/services/providers/groq.provider.js
- backend/src/services/providers/openrouter.provider.js
- backend/src/utils/ai.prompts.js
</read_first>
<action>
Create `backend/src/services/ai.service.js`.
Implement core entry point `generateCompletion({ taskType, input, metadata })` that:
1. Dynamically selects the appropriate prompt template from `ai.prompts.js`.
2. Uses LRU Cache to check if a cached response exists for repeated deterministic prompts.
3. Routes request through the primary provider (Groq). If it fails, falls back to OpenRouter.
4. Implements retry logic with exponential backoff and circuit-breaking.
5. If both fail, throws a specific Error that resolves to 503 Service Unavailable or 429 Too Many Requests, not exposing raw errors.
6. Enforces schema validation on AI responses and rejects malformed outputs (retrying or throwing).
7. Wraps all calls in structured Winston logging with metadata {userId, meetingId, endpoint, latency, provider, token_usage}. Truncate prompts/responses to avoid log bloat.
Implement `preProcessAvailability(unnormalizedData)` for time suggestions to deterministicly filter using existing logic before hitting the AI.
</action>
<acceptance_criteria>
- `backend/src/services/ai.service.js` exports `generateCompletion` function.
- It includes logic catching provider thrown errors and re-attempting with the fallback provider.
- It logs requests, successes, and failures using Winston.
</acceptance_criteria>
</task>

## Task 4: AI Zod Schemas and Controllers
<task>
<read_first>
- backend/src/middleware/errorHandler.js
- backend/src/api/auth/auth.middleware.js
</read_first>
<action>
Create `backend/src/api/ai/ai.schema.js`, define:
- `suggestTimesSchema`: no body or query schema needed if it uses `meetingId` parameter in the URL.
- `draftEmailSchema`: `{ body: z.object({ meetingId: z.string().uuid(), contextType: z.enum(["invite", "reminder", "follow-up"]) }) }`.
- `summarySchema`: `{ body: z.object({ meetingId: z.string().uuid(), notes: z.string() }) }`.

Create `backend/src/api/ai/ai.controller.js`.
- Export `suggestTimes` (aggregates Prisma data, normalizes, calls AI service).
- Export `draftEmail` (fetches meeting + participants, calls AI service).
- Export `summary` (calls AI service).
Controllers must be THIN, only handling req/res processing and delegating to `ai.service.js`.
</action>
<acceptance_criteria>
- `backend/src/api/ai/ai.schema.js` exports the 3 Zod schemas.
- `backend/src/api/ai/ai.controller.js` imports the AI service and delegates logic.
- Zod validations are properly hooked up in a way that respects Zod structures.
</acceptance_criteria>
</task>

## Task 5: AI Routes and App Integration
<task>
<read_first>
- backend/src/app.js
- backend/src/api/ai/ai.controller.js
</read_first>
<action>
Create `backend/src/api/ai/ai.routes.js`.
Expose Zod-validated endpoints (and RBAC middleware, e.g. `authorizeUser` / `authorizeAdmin` via `requireAuth` and `requireAdmin`):
- `GET /suggest-times/:meetingId` (admin-only)
- `POST /draft-email` (admin-only)
- `POST /summary` (admin or user)

Update `backend/src/app.js` to mount `/api/ai` to `aiRoutes`.
</action>
<acceptance_criteria>
- `backend/src/api/ai/ai.routes.js` clearly mounts `router.get('/suggest-times/:meetingId')`, `router.post('/draft-email')`, and `router.post('/summary')`.
- `backend/src/app.js` contains `app.use('/api/ai', aiRoutes)`.
</acceptance_criteria>
</task>

## Task 6: Testing the AI Layer
<task>
<read_first>
- backend/jest.config.js
- backend/test/api/meetings.test.js
</read_first>
<action>
Create `backend/test/api/ai.test.js`.
Use Supertest and Jest to write integration tests for:
- `GET /api/ai/suggest-times/:meetingId`
- `POST /api/ai/draft-email`
- `POST /api/ai/summary`

IMPORTANT: Mock the AI providers (do not hit real APIs). Include tests for scenarios:
- Successful responses returning correct JSON structures.
- Provider fallback behaviors (mock Groq to fail and OpenRouter to succeed).
- Malformed AI output from the mocks handling.
- Rate limits / timeouts resolving correctly in a 503 or 429 response body.
- Verify consistent schema shapes and statuses.
</action>
<acceptance_criteria>
- `backend/test/api/ai.test.js` exists and runs `describe('AI Logic')`.
- `backend/test/api/ai.test.js` imports and mocks `ai.service.js` or the provider libraries.
- The tests run and check for HTTP 503 / 429 gracefully for errored provider loops.
</acceptance_criteria>
</task>

## Verification
- Run `npm test` and assert that all integration tests pass (both successful flows and mocked failure cases).
- Review Winston error logging behavior under simulated mock failures.
