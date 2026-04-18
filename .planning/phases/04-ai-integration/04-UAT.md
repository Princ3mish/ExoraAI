---
status: testing
phase: 04-ai-integration
source: [04-SUMMARY.md]
started: 2026-04-19T02:29:09+05:30
updated: 2026-04-19T02:31:00+05:30
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 2
name: AI Suggest Times Endpoint (Admin Access)
expected: |
  Sending `GET /api/ai/suggest-times/:meetingId` with a valid admin JWT and an existing meetingId returns HTTP 200 with a JSON body containing `data.suggestions` — an array of objects each having `start`, `end`, and `score` fields.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server. Run `npm test` from the backend directory. All 29 tests (4 suites) pass without errors — including the 13 new AI integration tests.
result: pass

### 2. AI Suggest Times Endpoint (Admin Access)
expected: Sending `GET /api/ai/suggest-times/:meetingId` with a valid admin JWT and an existing meetingId returns HTTP 200 with a JSON body containing `data.suggestions` — an array of objects each having `start`, `end`, and `score` fields.
result: [pending]

### 3. AI Suggest Times Endpoint (Non-Admin Denied)
expected: Sending `GET /api/ai/suggest-times/:meetingId` with a USER-role JWT returns HTTP 403 with a permission error message.
result: [pending]

### 4. AI Draft Email Endpoint
expected: Sending `POST /api/ai/draft-email` with `{ meetingId, contextType: "invite" }` and an admin JWT returns HTTP 200 with `data.subject` (string) and `data.body` (string) — a polished email draft.
result: [pending]

### 5. AI Draft Email Validation
expected: Sending `POST /api/ai/draft-email` with an invalid `contextType` (e.g., `"invalid-type"`) returns HTTP 400 with a Zod validation error.
result: [pending]

### 6. AI Summary Endpoint (Admin)
expected: Sending `POST /api/ai/summary` with `{ meetingId, notes }` and an admin JWT returns HTTP 200 with `data.summary`, `data.bulletPoints`, `data.actionItems`, and `data.decisions`.
result: [pending]

### 7. AI Summary Endpoint (Participant Access)
expected: A USER who is a participant in the meeting can call `POST /api/ai/summary` and receive HTTP 200 — they are not blocked by RBAC.
result: [pending]

### 8. Provider Fallback (Groq → OpenRouter)
expected: When the Groq provider fails (e.g., rate limit), the system automatically falls back to OpenRouter and still returns a successful HTTP 200 response. Verified by the Jest test `should fallback to OpenRouter when Groq fails`.
result: [pending]

### 9. Both Providers Fail — 503 Response
expected: When both Groq and OpenRouter fail with network errors, the endpoint returns HTTP 503 with a user-friendly message. No raw provider errors are exposed.
result: [pending]

### 10. Both Providers Rate-Limited — 429 Response
expected: When both providers return 429 rate-limit errors, the endpoint returns HTTP 429 (not 503), distinguishing overload from outage.
result: [pending]

### 11. Malformed AI Output Handling
expected: When providers return non-JSON or schema-invalid output, the system retries across providers then returns HTTP 503. It does not crash or return partial/malformed data.
result: [pending]

### 12. Unauthenticated Request Denied
expected: Calling any AI endpoint without a Bearer token returns HTTP 401.
result: [pending]

### 13. App.js Route Registration
expected: `backend/src/app.js` contains `app.use('/api/ai', aiRoutes)` — the AI routes are mounted and accessible.
result: [pending]

## Summary

total: 13
passed: 1
issues: 0
pending: 12
skipped: 0

## Gaps

[none yet]
