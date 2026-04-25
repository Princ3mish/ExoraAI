# Phase 6: Autonomous Orchestration & Real-Time Features — Context

**Gathered:** 2026-04-25
**Status:** Ready for planning
**Source:** PRD Express Path (User Request)

<domain>
## Phase Boundary

Transform Exora AI from a CRUD + AI tool into an **active orchestration system** that visibly "does work" on behalf of the user. This phase is a transformation layer on top of the stable Phase 1–5 system.

Deliverables:
1. **AI Action Log** — Centralized `AIEvent` Prisma model + event writing in all services
2. **Real-time Event Delivery** — Polling endpoint + frontend poll loop
3. **AI Assistant Panel** — Chat/timeline hybrid UI (critical frontend feature)
4. **Real Email Sending** — Nodemailer Gmail SMTP integration
5. **Voice Simulation** — Frontend AI-generated call simulation in AI panel
6. **Failure Handling & Observability** — Retry buttons, graceful degradation, consistent logs/UI
</domain>

<decisions>
## Implementation Decisions

### D-01: AIEvent Prisma Model
Add new `AIEvent` model to `backend/prisma/schema.prisma`:
```prisma
model AIEvent {
  id        String   @id @default(cuid())
  type      String   // AI_ACTION | SYSTEM | USER_RESPONSE | ERROR | SIMULATION
  message   String
  status    String   // success | pending | failed
  meetingId String?
  userId    String?
  metadata  Json?
  createdAt DateTime @default(now())

  meeting   Meeting? @relation(fields: [meetingId], references: [id])
  user      User?    @relation(fields: [userId], references: [id])
}
```
Also add `events AIEvent[]` to `Meeting` and `User` models. Run `npx prisma db push --accept-data-loss` after schema change.

### D-02: Event Writing Pattern
Every service must write to AIEvent. Create a shared helper `backend/src/utils/logEvent.js`:
```js
export async function logEvent({ type, message, status, meetingId, userId, metadata }) {
  await prisma.aIEvent.create({ data: { type, message, status, meetingId, userId, metadata } });
}
```
Services that MUST call logEvent:
- `meetings.service.js` — on createMeeting, updateMeeting, respondToInvite
- `ai.service.js` — on successful AI completion, on fallback trigger, on failure
- `email.service.js` (new) — on email send success, on email send failure
- `ai.controller.js` — simulation steps

### D-03: Events Polling Endpoint
New file `backend/src/api/events/events.routes.js` + `events.controller.js`:
- `GET /api/events` — auth required, returns 50 most recent AIEvents ordered by createdAt DESC
- Optional query params: `?since=<ISO_timestamp>` to return only newer events (efficient polling)
- Returns: `{ events: AIEvent[], total: number }`
- Mount in `app.js`: `app.use('/api/events', eventsRoutes)`

### D-04: Email Service (Nodemailer)
Create `backend/src/services/email.service.js`:
```js
import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});
export async function sendEmail({ to, subject, body }) { ... }
```
- Called from `meetings.service.js` AFTER meeting creation (fire-and-forget with try/catch)
- Logs AIEvent type=`AI_ACTION`, status=`success` or `failed` on outcome
- Also logs Winston structured event
- Add `EMAIL_USER` and `EMAIL_PASS` to `backend/.env` and `.env.example`
- Install: `npm install nodemailer`

### D-05: Email Flow Integration
In `meetings.service.js` createMeeting:
1. Create meeting + participants (existing)
2. Log `SYSTEM` event: "Meeting '{title}' created with {N} participants"
3. Fire AI draft email via `ai.service.js` generateCompletion({ taskType: 'DRAFT_EMAIL', ... })
4. Log `AI_ACTION` event: "AI drafting invite email for '{title}'"
5. Call `email.service.js sendEmail` (non-blocking, .catch() handler)
6. Log `AI_ACTION` event: "Sending invite to {email}" per participant (or batch)
7. On email success: log `AI_ACTION` status=success "Email sent to {email}"
8. On email failure: log `ERROR` status=failed "Email failed for {email}: {reason}", DO NOT throw

### D-06: AI Assistant Panel (Frontend)
New component `frontend/src/components/ai/AIAssistantPanel.tsx`:
- Positioned as a slide-in panel or fixed sidebar section (admin-only visible)
- Polls `GET /api/events` every 4 seconds using setInterval + cleanup on unmount
- Renders events as a vertical timeline with icons and color-coded by type:
  - `AI_ACTION` → purple/blue icon (Brain/Cpu icon)
  - `SYSTEM` → gray icon (Server icon)
  - `USER_RESPONSE` → green icon (User icon)
  - `ERROR` → red icon (AlertCircle icon) + Retry button
  - `SIMULATION` → orange icon (Phone icon)
- Each event shows: type badge, message, timestamp (relative: "2s ago"), status dot
- Smooth scroll to bottom on new events (like a chat window)
- Max height with overflow-y scroll
- "Refresh" fallback button if polling fails
- If polling fails 3x consecutively: show "Connection lost — click Refresh" banner

### D-07: Voice Simulation Feature
In `MeetingDetail.tsx`, admin sees "Call Participant" button per participant row.
On click:
1. POST to new endpoint `POST /api/ai/simulate-call` with `{ meetingId, participantId }`
2. Backend logs: `SIMULATION` event "Initiating call to {name}…" (status: pending)
3. Backend calls AI to generate a 6–8 turn conversation script:
   ```
   Generate a realistic phone negotiation script between an AI meeting scheduler and {name} about meeting '{title}' on {date}. Return JSON: { "script": [{ "speaker": "AI"|"Participant", "line": "..." }] }
   ```
4. Backend logs: `SIMULATION` event "Call script generated" (status: success)
5. Returns script to frontend
6. Frontend replays script step-by-step in AIAssistantPanel with 800ms delay between turns
7. Each turn logs as a SIMULATION event via `/api/events` poll (or shows optimistically)
8. Structured for future Twilio/Web Speech API: script format is standard

### D-08: User Dashboard Real-Time Polling
In `frontend/src/pages/dashboard/DashboardOverview.tsx` and any user-facing meeting list:
- Poll `GET /api/meetings` every 5 seconds for USERs to see invite updates
- Use `useEffect` + `setInterval` + cleanup
- Show subtle "Live" indicator dot when polling is active
- On poll error: show "Auto-refresh paused — Refresh" button

### D-09: Failure Handling Standards
Every external call must follow this pattern:
- Try/catch wrapping all email sends and AI calls
- On failure: logEvent({ type: 'ERROR', status: 'failed', message: '...' })
- Winston logger.error() with full error context
- Frontend: show Retry button on ERROR-type AIPanel events
- Retry button calls the originating endpoint again
- No silent failures anywhere in the system

### D-10: Backend Module Structure
New files for Phase 6:
```
backend/src/
├── api/events/
│   ├── events.routes.js
│   └── events.controller.js
├── api/ai/
│   └── (extend ai.routes.js with /simulate-call)
├── services/
│   └── email.service.js
└── utils/
    └── logEvent.js
```

### Agent's Discretion
- Frontend panel animation specifics (enter/exit transitions, timeline connector style)
- Exact Nodemailer transporter options (can add TLS/STARTTLS config if needed)
- Polling interval fine-tuning (3–5s range is acceptable)
- Whether simulation script replay uses optimistic UI vs waiting for poll cycle
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Backend Patterns
- `backend/src/api/ai/ai.routes.js` — Existing AI route pattern to follow
- `backend/src/api/ai/ai.controller.js` — Existing controller pattern
- `backend/src/api/meetings/meetings.service.js` — Where to inject email + event logging
- `backend/src/services/ai.service.js` — Provider orchestration (extend for simulation)
- `backend/prisma/schema.prisma` — Must add AIEvent model here
- `backend/src/app.js` — Must mount new routes here

### Existing Frontend Patterns
- `frontend/src/components/ai/AIDraftEmail.tsx` — Existing AI component pattern
- `frontend/src/pages/dashboard/MeetingDetail.tsx` — Where to embed AIAssistantPanel + simulate-call button
- `frontend/src/api/client.ts` — Axios client for all API calls
- `frontend/src/pages/dashboard/DashboardOverview.tsx` — Where to add user polling
</canonical_refs>

<specifics>
## Specific Implementation Notes

- The AI panel should feel "alive" — it is the primary showcase feature of Phase 6
- Email sending must NEVER block the API response — always fire-and-forget
- The `AIEvent` table is the single source of truth for the AI panel; Winston is secondary
- Voice simulation is purely visual/text — no real audio required
- The `?since=` query param on `/api/events` is important for efficiency but not blocking
- Install `nodemailer` in backend: `npm install nodemailer`
- No new frontend packages required (ShadCN + Lucide + existing stack covers it)
</specifics>

<deferred>
## Deferred Ideas

- SSE (Server-Sent Events) — planned as future upgrade; polling structure must make this easy
- Web Speech API / Twilio for real voice — simulation structures for this but no implementation
- Email templates with HTML formatting — plain text OK for Phase 6
- WebSocket support — deferred to future phase
</deferred>

---

*Phase: 06-autonomous-orchestration*
*Context gathered: 2026-04-25 via PRD Express Path*
