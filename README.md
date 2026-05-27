# Exora AI

> Your AI-Powered Meeting Assistant — schedule, confirm, 
> and prepare meetings automatically.

## 🔗 Live Demo

**[Try Exora AI →](your-vercel-url-here)**

| | |
|---|---|
| **Demo Email** | demo@exora.ai |
| **Demo Password** | demo123 |

> The demo account comes pre-loaded with sample meetings 
> so you can explore all features immediately.

## ✨ What it does

Exora AI automates your entire meeting workflow:

1. **You message the Telegram bot** — "Schedule a call with Rahul tomorrow at 3pm"
2. **Invites go out automatically** — participants receive email invitations instantly
3. **AI calls to confirm** — 30 minutes before the meeting, Exora calls each participant to confirm attendance and collect agenda topics
4. **You just show up** — open your calendar and see who's confirmed and what everyone wants to discuss

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind, ShadCN |
| Backend | Node.js, Express, Prisma, PostgreSQL |
| AI/LLM | Groq (primary), OpenRouter (fallback) |
| Voice | Vapi AI |
| Email | Resend |
| Bot | Telegram (Grammy) |
| Payments | Stripe |

## 🚀 Self-Host Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Accounts on: Groq, Vapi, Resend, Telegram BotFather

### 1. Clone and install
```bash
git clone https://github.com/Princ3mish/Exora-ai.git
cd Exora-ai

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment
```bash
cd backend
cp .env.example .env
# Edit .env and fill in your API keys

cd ../frontend  
cp .env.example .env
# Set VITE_API_URL=http://localhost:4000
```

### 3. Set up database
```bash
cd backend
npx prisma migrate dev
npx prisma db seed
```

### 4. Start ngrok (for Telegram webhook)
```bash
ngrok http 4000
# Copy the HTTPS URL to SERVER_URL in backend/.env
```

### 5. Register Telegram webhook
```bash
# Replace TOKEN and URL with your values:
curl -X POST \
  https://api.telegram.org/bot{TOKEN}/setWebhook \
  -d "url={SERVER_URL}/api/bot/telegram"
```

### 6. Start servers
```bash
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm run dev
```


## 📁 Project Structure

```
Exora-ai/
├── backend/
│   ├── src/
│   │   ├── api/          # REST API routes
│   │   ├── bot/          # Telegram bot logic
│   │   ├── jobs/         # Cron jobs (voice calls)
│   │   ├── services/     # Email, AI services
│   │   └── utils/        # Helpers, logger
│   └── prisma/           # Database schema + migrations
└── frontend/
    └── src/
        ├── components/   # Reusable UI components
        ├── pages/        # Route pages
        ├── hooks/        # Custom React hooks
        └── types/        # TypeScript types
```

## 🔑 Required API Keys

| Service | Free Tier | Get it at |
|---|---|---|
| Groq | 1000 req/day | console.groq.com |
| Vapi | Limited calls | dashboard.vapi.ai |
| Resend | 3000 emails/mo | resend.com |
| Telegram | Free | @BotFather on Telegram |
| Stripe | Test mode free | stripe.com |

## 📄 License
MIT — free to use and modify.
