<h1 align="center">
  <br />
  <img src="https://img.shields.io/badge/Exora-AI-6366f1?style=for-the-badge&logo=openai&logoColor=white" alt="Exora AI" />
  <br /><br />
  Exora AI — Your AI-Powered Meeting Assistant
  <br />
</h1>

<p align="center">
  <strong>Schedule, confirm, and prepare every meeting — automatically.</strong>
  <br />
  Text a Telegram bot. Your AI does the rest.
</p>

<p align="center">
  <a href="#-live-demo">Live Demo</a> •
  <a href="#-what-is-exora-ai">What is Exora AI?</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-features">Features</a> •
  <a href="#-pricing">Pricing</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-self-host-setup">Self-Host Setup</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-project-structure">Project Structure</a> •
  <a href="#-contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Telegram-Bot-26A5E4?logo=telegram&logoColor=white" />
  <img src="https://img.shields.io/badge/AI-Groq%20%7C%20Vapi-6366f1" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
</p>

---

 🔗 Live Demo

> **[Try Exora AI →](https://your-vercel-url-here)** *(update with your deployed URL)*

| Credential | Value |
|---|---|
| **Demo Email** | `demo@exora.ai` |
| **Demo Password** | `demo123` |

The demo account is pre-loaded with sample meetings and contacts so you can explore every feature immediately — no setup needed.

---

## 🤔 What is Exora AI?

**Exora AI** is an intelligent meeting orchestration platform that removes every manual step from scheduling, confirming, and preparing meetings.

Instead of going back and forth over email, opening calendar apps, or chasing participants for RSVPs, you send a single message to a Telegram bot. Exora handles **everything else**:

- It schedules the meeting and saves it to your calendar instantly
- It sends email invitations to every participant automatically  
- It calls each participant by phone (via AI voice) 30 minutes before the meeting to confirm attendance and collect agenda topics
- It displays confirmed attendees and the spoken agenda on your dashboard — before you even walk into the room

**You just show up.**

### Who is it for?

| User | Why Exora AI |
|---|---|
| **Busy professionals** | Stop wasting time on scheduling admin |
| **Consultants & freelancers** | Automate client meeting coordination |
| **Small teams** | Eliminate back-and-forth scheduling emails |
| **Recruiters** | Coordinate candidate interviews without manual follow-up |
| **Startup founders** | Run investor meetings without an EA |

---

## ⚡ How It Works

```
You → Telegram Bot → Meeting Created → Email Invites Sent
                                             ↓
                               30 min before meeting:
                          AI Voice Call to Each Participant
                                             ↓
                              Attendance Confirmed + Agenda Extracted
                                             ↓
                                  You open the dashboard.
                              Everything is ready. You just show up.
```

### Step-by-step walkthrough

**Step 1 — Message the Telegram Bot**

Open Telegram and send a natural language message to your Exora bot:

> *"Schedule a call with Rahul tomorrow at 3pm"*

Exora's AI understands intent, extracts the time, date, and participants, and replies with a confirmation within seconds.

---

**Step 2 — Email Invitations Go Out**

The moment you confirm the booking, every participant receives a professional email invitation via **Resend**. No manual CC-ing required.

---

**Step 3 — AI Voice Call Confirms Attendance**

30 minutes before the meeting, Exora's **Vapi AI voice agent** calls each participant. The AI:
- Confirms whether they can attend
- Asks for their agenda topics
- Transcribes and extracts the information automatically using Groq LLM

---

**Step 4 — Your Dashboard Updates**

The frontend calendar updates in real time (polling every 30 seconds). You can see:
- **Confirmation status** per participant
- **Extracted agenda topics** from the voice call
- **Voice call logs** in the activity feed

---

## ✨ Features

### 🤖 AI & Automation
| Feature | Description |
|---|---|
| **Natural language scheduling** | Tell the bot who and when — no forms, no clicks |
| **AI intent detection** | Groq LLM parses your message and identifies `CREATE_MEETING`, `LIST_MEETINGS`, `CANCEL`, and more |
| **Agenda extraction** | Vapi call transcripts are analysed by AI and structured agenda topics are saved automatically |
| **Cron-based voice calls** | node-cron polls every 5 minutes to trigger outbound calls for upcoming meetings |
| **Fallback LLM** | OpenRouter is used as a backup provider if Groq is unavailable |

### 📅 Calendar & Meetings
| Feature | Description |
|---|---|
| **Smart calendar view** | Day/week/month view with meeting cards showing status and agenda |
| **Meeting management** | Create, view, and cancel meetings from the dashboard |
| **Participant tracking** | Per-participant status: `PENDING`, `ACCEPTED`, `REJECTED` |
| **Availability management** | Set your availability windows to avoid scheduling conflicts |

### 📬 Communications
| Feature | Description |
|---|---|
| **Automatic email invites** | Professional invitations sent the moment a meeting is booked |
| **Telegram bot** | Grammy-powered webhook bot with conversational slot-filling |
| **AI voice calls** | Vapi-powered outbound calls with custom AI assistant persona |

### 📊 Analytics & Activity
| Feature | Description |
|---|---|
| **Activity feed** | Real-time log of bot sessions and voice call outcomes |
| **Analytics dashboard** | Meeting trends, confirmation rates, and voice call statistics |
| **Audit trail** | Every bot session is logged with intent, status, and linked meeting |

### 👥 Contacts & Billing
| Feature | Description |
|---|---|
| **Address book** | Contacts built automatically from past meeting participants |
| **Credit system** | Usage tracked per action (meeting creation, voice call) |
| **Stripe billing** | Subscription payments and credit top-ups |
| **Onboarding flow** | Guided setup to link Telegram and configure phone number |

---

## 💰 Pricing

| Plan | Price | Key Limits |
|---|---|---|
| **Starter** | Free forever | 10 meetings/mo, 5 contacts, no voice calls |
| **Pro** ⭐ | $12 / month | Unlimited meetings, voice calls, analytics |
| **Team** | $39 / month | Coming soon — shared calendar, 10 team members |

> No credit card required to start. Upgrade any time, cancel any time.

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **React** | 19 | UI framework |
| **TypeScript** | ~6.0 | Type safety |
| **Vite** | 8 | Build tooling |
| **Tailwind CSS** | 3.4 | Utility-first styling |
| **ShadCN / Radix UI** | Latest | Accessible UI components |
| **Framer Motion** | 12 | Animations and transitions |
| **React Router** | 7 | Client-side routing |
| **React Hook Form + Zod** | Latest | Form validation |
| **Recharts** | 3 | Analytics charts |
| **date-fns** | 4 | Date manipulation |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | 18+ | Runtime |
| **Express** | 5 | HTTP server |
| **Prisma** | 5.22 | ORM and migrations |
| **PostgreSQL** | 15+ | Primary database |
| **Grammy** | 1.42 | Telegram bot framework |
| **Vapi Server SDK** | 1.2 | Voice AI integration |
| **Resend** | 6 | Transactional email |
| **Stripe** | 22 | Payment processing |
| **node-cron** | 4 | Scheduled jobs |
| **Winston** | 3 | Structured logging |
| **Zod** | 4 | Runtime schema validation |
| **bcrypt** | 6 | Password hashing |
| **JSON Web Tokens** | 9 | Auth tokens |

### AI & External Services
| Service | Purpose | Free Tier |
|---|---|---|
| **Groq** | Primary LLM (intent extraction, agenda parsing) | 1,000 req/day |
| **OpenRouter** | Fallback LLM provider | Varies by model |
| **Vapi AI** | Outbound voice call agent | Limited calls |
| **Resend** | Email delivery | 3,000 emails/month |
| **Telegram** | Bot interface via Grammy | Free |
| **Stripe** | Subscriptions and credit purchases | Test mode free |

---

🚀 Self-Host Setup

### Prerequisites

- **Node.js** 18 or later
- **PostgreSQL** 15 or later (local or hosted on Neon, Supabase, Railway, etc.)
- **ngrok** (for exposing your local server to Telegram's webhook)
- Accounts on: [Groq](https://console.groq.com), [Vapi](https://dashboard.vapi.ai), [Resend](https://resend.com), [Telegram BotFather](https://t.me/BotFather)

---

### 1. Clone the repository

```bash
git clone https://github.com/Princ3mish/ExoraAI.git
cd ExoraAI
```

---

### 2. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

---

### 3. Configure the backend environment

```bash
cd backend
cp .env.example .env   # or create .env manually
```

Edit `backend/.env` and fill in the following variables:

```env
# ── Database ──────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/exora_ai"

# ── Authentication ────────────────────────────────────────────────────────
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"

# ── AI / LLM ──────────────────────────────────────────────────────────────
GROQ_API_KEY="gsk_..."
OPENROUTER_API_KEY="sk-or-..."         # optional fallback

# ── Voice (Vapi) ──────────────────────────────────────────────────────────
VAPI_API_KEY="..."
VAPI_ASSISTANT_ID="..."
VAPI_PHONE_NUMBER_ID="..."

# ── Email (Resend) ─────────────────────────────────────────────────────────
RESEND_API_KEY="re_..."
FROM_EMAIL="Exora AI <meetings@yourdomain.com>"

# ── Telegram ──────────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN="..."
SERVER_URL="https://your-ngrok-url.ngrok.io"    # or your production URL

# ── Stripe ────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# ── Server ────────────────────────────────────────────────────────────────
PORT=4000
NODE_ENV=development
```

---

### 4. Configure the frontend environment

```bash
cd frontend
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:4000
```

---

### 5. Set up the database

```bash
cd backend

# Run migrations
npx prisma migrate dev --name init

# (Optional) seed demo data
npx prisma db seed
```

---

### 6. Start ngrok (for Telegram webhook)

Telegram requires a publicly accessible HTTPS URL to deliver bot messages. During development, use ngrok:

```bash
ngrok http 4000
```

Copy the `https://...ngrok.io` URL and set it as `SERVER_URL` in `backend/.env`.

---

### 7. Register the Telegram webhook

Replace `{TOKEN}` and `{SERVER_URL}` with your values:

```bash
curl -X POST \
  https://api.telegram.org/bot{TOKEN}/setWebhook \
  -d "url={SERVER_URL}/api/bot/telegram"
```

You should receive: `{"ok":true,"result":true,"description":"Webhook was set"}`

---

### 8. Start the servers

```bash
# Terminal 1 — Backend (port 4000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — you're live.

---

### 9. Link your Telegram account

1. Register an account on the frontend
2. Go to **Settings → Integrations**
3. Click **Link Telegram** and follow the instructions to connect your Telegram account to your Exora profile

---

## 📋 API Reference

All endpoints are prefixed with `/api`. Authentication uses **Bearer JWT tokens**.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create a new account |
| `POST` | `/api/auth/login` | Log in, receive JWT |
| `GET` | `/api/auth/me` | Get current user profile |

### Meetings
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/meetings` | List all meetings for the current user |
| `POST` | `/api/meetings` | Create a new meeting |
| `GET` | `/api/meetings/:id` | Get a specific meeting with participants |
| `PATCH` | `/api/meetings/:id` | Update meeting details |
| `DELETE` | `/api/meetings/:id` | Cancel a meeting |

### Voice
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/voice/webhook` | Vapi end-of-call webhook (internal) |
| `GET` | `/api/voice/logs` | List voice call logs |

### Bot
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/bot/telegram` | Telegram webhook (internal) |
| `GET` | `/api/bot/sessions` | List recent bot sessions |

### Contacts
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/contacts` | List user's address book |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/summary` | Meeting and voice call statistics |

### Billing
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/billing/checkout` | Create a Stripe checkout session |
| `POST` | `/api/billing/webhook` | Stripe webhook (internal) |
| `GET` | `/api/billing/credits` | Get current credit balance |

### Health
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server and database health check |

---

## 📁 Project Structure

```
ExoraAI/
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database models (User, Meeting, Participant, ...)
│   │   └── migrations/            # Prisma migration history
│   │
│   ├── src/
│   │   ├── api/
│   │   │   ├── ai/                # AI route (prompt → LLM response)
│   │   │   ├── analytics/         # Usage statistics endpoints
│   │   │   ├── auth/              # Register, login, JWT
│   │   │   ├── availability/      # User availability windows
│   │   │   ├── billing/           # Stripe checkout + webhook
│   │   │   ├── bot/               # Bot session REST endpoints
│   │   │   ├── contacts/          # Address book API
│   │   │   ├── events/            # AI event log (activity feed)
│   │   │   ├── meetings/          # Full CRUD for meetings
│   │   │   ├── participants/      # Participant management
│   │   │   ├── settings/          # User settings
│   │   │   ├── users/             # User profile endpoints
│   │   │   └── voice/             # Vapi webhook + call logs
│   │   │
│   │   ├── bot/
│   │   │   └── bot.js             # Grammy Telegram bot (NLP, slot-filling, session FSM)
│   │   │
│   │   ├── config/                # Environment and app config
│   │   ├── jobs/                  # node-cron scheduled jobs (voice call trigger)
│   │   ├── middleware/            # Auth guard, error handler
│   │   ├── modules/               # Shared utility modules
│   │   ├── services/
│   │   │   ├── ai.service.js      # Groq / OpenRouter LLM client + prompt chaining
│   │   │   ├── email.service.js   # Resend email templates
│   │   │   └── providers/         # LLM provider abstraction layer
│   │   ├── utils/
│   │   │   └── logger.js          # Winston structured logger
│   │   ├── app.js                 # Express app, route mounting, middleware
│   │   ├── prompts.js             # All LLM prompt templates
│   │   └── server.js              # HTTP server entry point
│   │
│   ├── test/                      # Integration tests
│   ├── regression.test.mjs        # End-to-end regression suite
│   └── package.json
│
└── frontend/
    ├── public/                    # Static assets
    ├── src/
    │   ├── api/                   # Axios API client wrappers
    │   ├── assets/                # Images, icons, fonts
    │   ├── components/
    │   │   └── ui/                # Reusable ShadCN-based components
    │   ├── context/
    │   │   └── AuthContext.tsx    # Global auth state (JWT + user)
    │   ├── hooks/                 # Custom React hooks
    │   ├── lib/
    │   │   └── api.ts             # Axios instance with auth interceptor
    │   ├── pages/
    │   │   ├── Landing.tsx        # Public marketing page
    │   │   ├── Login.tsx          # Auth pages
    │   │   ├── Register.tsx
    │   │   ├── OnboardingPage.tsx # Post-registration setup flow
    │   │   ├── Dashboard.tsx      # Main calendar + activity feed
    │   │   ├── MeetingsPage.tsx   # Meeting list and management
    │   │   ├── ContactsPage.tsx   # Address book
    │   │   ├── AnalyticsPage.tsx  # Charts and statistics
    │   │   ├── BillingPage.tsx    # Plan management + Stripe
    │   │   └── SettingsPage.tsx   # Profile, integrations, notifications
    │   ├── routes/                # React Router configuration
    │   ├── types/                 # Shared TypeScript interfaces
    │   ├── App.tsx
    │   └── main.tsx
    │
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.js
    └── package.json
```

---

## 🗄 Database Schema

Exora AI uses **PostgreSQL** via **Prisma ORM**. Key models:

| Model | Description |
|---|---|
| `User` | Accounts with Telegram link, credits, and plan |
| `Meeting` | Scheduled meetings with status, agenda topics, and voice call status |
| `Participant` | Many-to-many between Users and Meetings, with RSVP status and phone number |
| `Availability` | User-defined time windows for scheduling |
| `BotSession` | Tracks each Telegram conversation — intent, slots, and status |
| `VoiceCallLog` | Outbound call records — transcript, outcome, extracted agenda |
| `AIEvent` | General-purpose activity log (bot actions, AI calls, errors) |
| `AIResult` | Structured output from LLM analysis tasks |
| `UserContact` | Auto-built address book from meeting participant history |
| `CreditTransaction` | Audit trail for credit purchases and deductions |

---

## 🔑 Required API Keys

| Service | Free Tier | Sign up |
|---|---|---|
| **Groq** | 1,000 req/day | [console.groq.com](https://console.groq.com) |
| **Vapi AI** | Limited free calls | [dashboard.vapi.ai](https://dashboard.vapi.ai) |
| **Resend** | 3,000 emails/month | [resend.com](https://resend.com) |
| **Telegram BotFather** | Free | [@BotFather](https://t.me/BotFather) on Telegram |
| **Stripe** | Test mode free | [stripe.com](https://stripe.com) |
| **OpenRouter** | Pay-per-token (optional) | [openrouter.ai](https://openrouter.ai) |

---

## 🧪 Testing

### Run the test suite

```bash
cd backend

# Unit and integration tests
npm test

# Regression tests against a live backend
node regression.test.mjs
```

### Health check

```bash
curl http://localhost:4000/health
# → {"status":"ok","database":"connected"}
```

---

## 🚢 Deployment

### Frontend (Vercel — recommended)

The frontend includes a `vercel.json` that rewrites all routes to `index.html` for SPA support.

```bash
# Install Vercel CLI
npm i -g vercel

cd frontend
vercel --prod
```

Set `VITE_API_URL` to your production backend URL in the Vercel project settings.

### Backend (Railway / Render / Fly.io)

```bash
# Production start command
cd backend && npm start
```

Make sure to:
1. Set all environment variables on your hosting platform
2. Run `npx prisma migrate deploy` on first deploy
3. Update `SERVER_URL` in `.env` to your production domain
4. Re-register the Telegram webhook with the production URL

---

## 🔒 Security

- Passwords are hashed with **bcrypt** (10 salt rounds)
- All API routes are protected with **JWT Bearer token** middleware
- Stripe webhooks are verified using **Stripe-Signature** header validation
- CORS is configured via the `cors` package
- Input validation on all routes uses **Zod** schemas
- SQL injection protection via Prisma's parameterised queries

---

## 🤝 Contributing

Contributions are welcome. Please follow this workflow:

1. **Fork** the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and write tests if applicable
4. Ensure tests pass: `npm test`
5. **Commit** with a clear message: `git commit -m "feat: add X"`
6. Open a **Pull Request** with a description of what you changed and why

### Commit message convention

```
feat: add new feature
fix: resolve a bug
docs: update documentation
chore: dependency update or config change
refactor: code restructure without behaviour change
test: add or update tests
```

---

## 📄 License

MIT — free to use, modify, and distribute. See [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgements

Exora AI is built on top of exceptional open source software and services:

- [Grammy](https://grammy.dev) — the best Telegram bot framework for Node.js
- [Vapi AI](https://vapi.ai) — voice AI infrastructure
- [Groq](https://groq.com) — blazing-fast LLM inference
- [Prisma](https://prisma.io) — the next-generation ORM
- [ShadCN/UI](https://ui.shadcn.com) — beautiful accessible components
- [Resend](https://resend.com) — developer-first email platform

---

<p align="center">
  Built with care · © 2026 Exora AI
  <br />
  <em>Stop scheduling. Start meeting.</em>
</p>
