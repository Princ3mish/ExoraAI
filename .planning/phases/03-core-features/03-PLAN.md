---
phase: 3
wave: 1
depends_on: []
files_modified:
  - backend/prisma/schema.prisma
  - backend/package.json
  - backend/src/middleware/auth.js
  - backend/src/middleware/rbac.js
  - backend/src/modules/auth/auth.schema.js
  - backend/src/modules/auth/auth.service.js
  - backend/src/modules/auth/auth.controller.js
  - backend/src/modules/auth/auth.routes.js
  - backend/src/modules/availability/availability.schema.js
  - backend/src/modules/availability/availability.service.js
  - backend/src/modules/availability/availability.controller.js
  - backend/src/modules/availability/availability.routes.js
  - backend/src/modules/meetings/meetings.schema.js
  - backend/src/modules/meetings/meetings.service.js
  - backend/src/modules/meetings/meetings.controller.js
  - backend/src/modules/meetings/meetings.routes.js
  - backend/src/app.js
autonomous: true
---

# Phase 3: Core Features (MVP Logic) Plan

## Verification Criteria
- `npx prisma db push --accept-data-loss` succeeds locally and updates the database schema.
- Password hashing via bcrypt is properly integrated during registration context.
- Login endpoint securely validates credentials and returns a signed JWT.
- JWT verification middleware safely exposes payload on `req.user`.
- Missing or malformed tokens yield proper 401 Unauthorized errors.
- Role-based middleware blocks USER from ADMIN-gated routes with 403 Forbidden.
- Meetings can be successfully created (ADMIN only), associating `Participant` records populated to `PENDING` by default.
- Participants can transition status to `ACCEPTED` or `REJECTED`.
- Conflict detection actively intercepts and throws 400 when an overlapping meeting is detected for an attendee in PENDING / ACCEPTED state.
- Graceful degradation through the `errorHandler.js` central structure is confirmed.
- `validateRequest` strictly governs all request bodies in newly generated routers.

<task>
  <id>3.1</id>
  <title>[BLOCKING] Update Prisma Schema and DB Push</title>
  <read_first>
    - backend/prisma/schema.prisma
  </read_first>
  <action>
    Modify `backend/prisma/schema.prisma` to incorporate required authentication and participant workflows:
    1. Update `User` model by adding `password String`.
    2. Define `enum ParticipantStatus { PENDING ACCEPTED REJECTED }`.
    3. Update `Participant` model by adding `status ParticipantStatus @default(PENDING)`.
    
    AFTER the schema modification, you MUST run the database push to sync the actual DB instance:
    Execute `npx prisma db push --accept-data-loss` within the `backend/` directory.
  </action>
  <acceptance_criteria>
    - `backend/prisma/schema.prisma` contains `password String` in `model User`.
    - `backend/prisma/schema.prisma` contains `enum ParticipantStatus`.
    - `backend/prisma/schema.prisma` contains `status ParticipantStatus @default(PENDING)` in `model Participant`.
    - Database schema push command succeeds without interactive blocker.
  </acceptance_criteria>
</task>

<task>
  <id>3.2</id>
  <title>Setup Auth Modules and Security Middleware</title>
  <read_first>
    - backend/package.json
    - backend/src/middleware/validateRequest.js
    - backend/src/app.js
  </read_first>
  <action>
    1. Run `npm install bcrypt jsonwebtoken` and `npm install -D @types/bcrypt @types/jsonwebtoken` inside `backend/`.
    2. Create `backend/src/middleware/auth.js` that extracts the Bearer token, uses `jwt.verify` with `process.env.JWT_SECRET`, assigns decoded to `req.user`, and calls next(), or otherwise throws 401.
    3. Create `backend/src/middleware/rbac.js` exporting `const restrictTo = (roles) => (req, res, next) => { ... }` which verifies `req.user.role` is included in the array parameters, else throws 403.
    4. Create `backend/src/modules/auth/auth.schema.js` with Zod schemas `registerSchema` (email, password, name, role) and `loginSchema` (email, password).
    5. Create `backend/src/modules/auth/auth.service.js` which hashes incoming password on register (`bcrypt.hash`) and checks during login (`bcrypt.compare`), generating JWT via `jwt.sign({ userId, role })`. Handle user creation in Prisma.
    6. Create `backend/src/modules/auth/auth.controller.js` to dispatch these methods for HTTP.
    7. Create `backend/src/modules/auth/auth.routes.js` configuring validation middleware + endpoints.
    8. Add router integration to `backend/src/app.js` using `app.use('/api/auth', authRoutes)`.
  </action>
  <acceptance_criteria>
    - `backend/package.json` contains `bcrypt` and `jsonwebtoken`.
    - `backend/src/middleware/auth.js` exports JWT logic properly blocking on invalid tokens.
    - `backend/src/middleware/rbac.js` exports role gating closure.
    - `backend/src/modules/auth/auth.routes.js` maps POST /register and POST /login.
    - `backend/src/app.js` registers `/api/auth` routing.
  </acceptance_criteria>
</task>

<task>
  <id>3.3</id>
  <title>Implement Availability Workflows</title>
  <read_first>
    - backend/prisma/schema.prisma
    - backend/src/app.js
  </read_first>
  <action>
    1. Create `backend/src/modules/availability/availability.schema.js` with Zod `upsertAvailabilitiesSchema` expecting an array of slots (`dayOfWeek` Int, `startTime` String, `endTime` String).
    2. Create `backend/src/modules/availability/availability.service.js` implementing a Prisma delete-and-insert transaction for `userId`. 
    3. Create `backend/src/modules/availability/availability.controller.js` to expose creating/updating and polling logic.
    4. Create `backend/src/modules/availability/availability.routes.js` strictly wrapping with `auth.js` middleware. Mount routes like `POST /` and `GET /`.
    5. Append `app.use('/api/availability', availabilityRoutes)` within `backend/src/app.js`.
  </action>
  <acceptance_criteria>
    - `backend/src/modules/availability/availability.routes.js` enforces auth requirement on endpoints.
    - Transactions handling CRUD inside `availability.service.js` are strictly scoped to the `userId` in `req.user`.
    - Routing is mounted inside `backend/src/app.js`.
  </acceptance_criteria>
</task>

<task>
  <id>3.4</id>
  <title>Implement Meeting and Participant Module including Conflict Check</title>
  <read_first>
    - backend/prisma/schema.prisma
    - backend/src/middleware/validateRequest.js
    - backend/src/app.js
  </read_first>
  <action>
    1. Inside `backend/src/modules/meetings/meetings.service.js`:
       - Create logic to detect conflict (`findFirst` meeting where participants have `PENDING`/`ACCEPTED` intersecting `startTime` and `endTime`).
       - Write `createMeeting` persisting Meeting & initial Participant records. If participant yields conflict -> throw 400.
       - Write `getMeetings` returning all for ADMINs and participant-assigned array for USERs.
       - Write `respondToInvite(meetingId, userId, newStatus)`. Make sure to dynamically update Meeting status (to CONFIRMED etc.) based on all responses. Reject overlapping conflicts if attempting to transition to ACCEPTED.
    2. Inside `backend/src/modules/meetings/meetings.controller.js`: Convert logic errors to clean `next()`.
    3. Create `backend/src/modules/meetings/meetings.schema.js` wrapping `createMeetingSchema` and `responseSchema`.
    4. Create `backend/src/modules/meetings/meetings.routes.js`. `POST /` requires both auth and RBAC('ADMIN'). `GET /` and `PUT /:id/respond` require auth.
    5. Initialize route on `app.use('/api/meetings', meetingsRoutes)` within `backend/src/app.js`.
  </action>
  <acceptance_criteria>
    - `backend/src/modules/meetings/meetings.service.js` actively inspects database `startTime`/`endTime` boundaries for overlap.
    - Only `ADMIN` role is authorized to hit POST within `backend/src/modules/meetings/meetings.routes.js`.
    - API endpoints integrate smoothly into `backend/src/app.js` and apply `validateRequest` correctly to parse payload.
  </acceptance_criteria>
</task>
