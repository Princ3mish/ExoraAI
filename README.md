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
