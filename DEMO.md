# Exora AI — Live Demo Script

> **Audience:** Non-technical stakeholders, investors, potential users
> **Duration:** ~10 minutes
> **Presenter:** Keep this document open on a second screen or phone

---

## Prerequisites — Everything That Must Be Running Before You Start

| What | Where | Status check |
|------|-------|-------------|
| PostgreSQL database | Local (port 5432) | `psql -U postgres -c "\l"` shows `meeting_ai` |
| ngrok tunnel | Terminal 1 | `ngrok http 4000` — copy the `https://` URL |
| Backend server | Terminal 2 | `cd backend && npm run dev` — shows "Server started on port 4000" |
| Frontend app | Terminal 3 | `cd frontend && npm run dev` — shows localhost URL |
| Telegram bot webhook | One-time setup | Webhook registered at `<ngrok-url>/api/bot/telegram` |
| Vapi dashboard open | Browser tab | https://dashboard.vapi.ai — Test tab visible |
| Frontend calendar open | Browser tab | e.g. http://localhost:5173 — calendar visible |

> **Before starting:** Send a test message to the bot in Telegram to confirm it's alive.
> You should get a reply within 3 seconds.

---

## The Demo Flow — Step by Step

### Step 1 — Schedule a Meeting via Telegram

**What to do:**
1. Open Telegram on your phone or at https://web.telegram.org
2. Open your chat with the **Exora AI Bot**
3. Send exactly this message:
   > `Schedule a call with Rahul tomorrow at 3pm`

**What to say to the audience:**
> "Watch how Exora understands plain English — no forms, no clicks.
> I'm just texting it like I'd text a colleague."

**What the audience should see:**
- The bot replies within a few seconds with a confirmation message like:
  > "Got it! Scheduling a call with Rahul for tomorrow at 3:00 PM. Shall I confirm?"
- Send `Yes` (or `Confirm`) to complete the booking
- Bot replies: "Meeting scheduled! Rahul will receive an email invitation."

**Success looks like:** Bot sends a confirmation message with the meeting details.

---

### Step 2 — Check the Calendar

**What to do:**
1. Switch to the browser tab with the **Exora AI frontend**
2. Look at the calendar view for tomorrow's date

**What to say to the audience:**
> "The moment the bot confirmed that meeting, it was saved to the database
> and it appears here on the calendar — no manual entry needed."

**What the audience should see:**
- A meeting card visible on tomorrow's date slot
- The card shows the title (e.g. "Call with Rahul"), time (3:00 PM), and status

**Success looks like:** Meeting card appears on the correct date in the calendar.

---

### Step 3 — Check the Activity Panel

**What to do:**
1. Look at the **Activity Panel** on the right side of the frontend
2. It shows the 10 most recent bot sessions

**What to say to the audience:**
> "Every conversation the bot has is logged here so you always have a full
> audit trail of what was scheduled, by whom, and when."

**What the audience should see:**
- A bot session entry showing:
  - Intent: `CREATE_MEETING`
  - Status: `completed`
  - Linked to the meeting just created

**Success looks like:** The newest session is at the top with `CREATE_MEETING` intent.

---

### Step 4 — Simulate the AI Voice Call

**What to do:**
1. Open the **Vapi dashboard** at https://dashboard.vapi.ai
2. Go to the **Test** tab for the Exora assistant
3. Click **Start Call** — this opens a browser microphone call
4. When the AI asks, say:
   > "Yes, I can attend the meeting. We should discuss the Q2 budget and team structure."
5. End the call

**What to say to the audience:**
> "This is Exora's voice agent — it calls participants automatically to confirm
> attendance and gather the agenda. No one has to send emails back and forth.
> The AI does it by phone."

**What the audience should see:**
- The Vapi interface shows an active call with audio waveforms
- The AI greets the participant and asks about attendance and agenda
- After ending the call, the dashboard shows the call completed

**Success looks like:** Call completes without errors. Duration shows in the Vapi dashboard.

---

### Step 5 — Watch the Backend Process the Call

**What to do:**
1. Switch to **Terminal 2** (backend logs)
2. Scroll to the most recent entries after the call ended

**What to say to the audience:**
> "The moment the call ends, Vapi sends us the full transcript.
> Our AI then reads through it and automatically extracts the agenda items —
> no human has to do any of this."

**What the audience should see in the logs:**
```
[VoiceService] End-of-call report received { callId: "...", durationSeconds: 45 }
[VoiceService] Agenda extracted { agendaTopics: ["Q2 budget", "Team structure"], confirmed: true, outcome: "confirmed" }
[VoiceService] Meeting record updated with agenda { meetingId: "...", agendaCount: 2, confirmed: true }
```

**Success looks like:** All three log lines appear with actual agenda topics extracted.

---

### Step 6 — See Agenda Topics on the Calendar

**What to do:**
1. Switch back to the **frontend calendar**
2. Click on the meeting card (or wait — the calendar polls for updates every 30 seconds)

**What to say to the audience:**
> "Without anyone touching a keyboard, the agenda from that phone call is now
> attached to the meeting record. The organizer can see exactly what was discussed
> and what was agreed."

**What the audience should see:**
- The meeting card now shows:
  - Status: `confirmed`
  - Agenda topics: Q2 budget, Team structure
  - Voice call status: `completed`

**Success looks like:** Agenda topics appear on the meeting card.

---

### Step 7 — Check the Activity Panel for Voice Log

**What to do:**
1. Look at the **Activity Panel** — scroll down or refresh

**What to say to the audience:**
> "Every voice interaction is also logged here alongside bot sessions,
> giving you complete visibility across every channel Exora uses."

**What the audience should see:**
- A voice call log entry showing:
  - Outcome: `confirmed`
  - Duration: (seconds of the call)
  - Summary: "Call confirmed — 2 agenda topics extracted"

**Success looks like:** Voice call log appears at the top of the activity feed.

---

## Demo Complete 🎉

> **Closing line to say:**
> "In about ten minutes, Exora AI scheduled a meeting, sent an email invitation,
> called the participant, understood their spoken agenda, and saved everything
> automatically — with zero manual data entry. That's the power of autonomous
> AI coordination."

---

## Fallback Notes — If Something Goes Wrong

| Problem | Quick fix |
|---------|-----------|
| Telegram bot doesn't reply | Check backend logs for the POST /api/bot/telegram request. Restart bot: `rs` in terminal 2. |
| Meeting doesn't appear on calendar | Refresh the page. Check `/api/meetings` returns data. |
| Activity panel shows nothing | Wait 15 seconds (polling interval). Check `/api/bot/session` returns 200. |
| Vapi call doesn't connect | Check VAPI_ASSISTANT_ID and VAPI_PHONE_NUMBER_ID in `.env`. Try the Vapi dashboard test call directly. |
| Agenda topics don't appear | Check backend logs for `[VoiceService] Agenda extracted`. Check GROQ_API_KEY in `.env`. |
| ngrok tunnel expired | Stop and restart ngrok. Re-register the Telegram webhook with the new URL. |
| Backend crashes on start | Check PostgreSQL is running. Run `npx prisma migrate deploy` in the backend directory. |

---

*Exora AI — built for the demo that sells itself.*
