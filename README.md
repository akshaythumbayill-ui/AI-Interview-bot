# 🎙️ MockingBird

A personalized voice-first mock interview agent for IT freshers.
Ask questions by voice, answer by voice or chat, get structured feedback, and track your progress over time.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React + Vite + Tailwind)                              │
│                                                                 │
│  Login/Register → Dashboard → Interview → Report / History     │
│       │             │                                           │
│  Web Speech API  speechSynthesis                                │
│  (mic → STT)     (TTS → speaker)                               │
└────────────────────┬────────────────────────────────────────────┘
                     │  REST (axios)
┌────────────────────▼────────────────────────────────────────────┐
│  FastAPI Backend (Python)                                        │
│                                                                 │
│  /api/interview/start  → resume parse → FAISS build             │
│  /api/interview/answer → RAG retrieve → Groq LLM eval           │
│                       → LangGraph state transition              │
│  /api/interview/{id}/report → aggregate + LLM summary           │
│  /api/interview/{id}/report/pdf → ReportLab PDF                 │
│  /api/history → SQLite sessions                                 │
│                                                                 │
│  LangGraph states:                                              │
│  INTRO → QUESTION → EVALUATE →                                  │
│    FOLLOW_UP | NEXT_TOPIC | HARDER | EASIER → FINAL_REPORT      │
│                                                                 │
│  Services:  llm · resume · rag · speech_analysis · report       │
│  Store:     SQLite (SQLAlchemy)                                  │
│  Vectors:   FAISS + sentence-transformers (all-MiniLM-L6-v2)    │
│  LLM:       Groq (llama-3.3-70b-versatile)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.10 + |
| Node.js | 18 + |
| npm | 9 + |
| Groq API key | free at console.groq.com |

---

## Getting a Groq API Key

1. Go to **https://console.groq.com**
2. Sign up / log in
3. Navigate to **API Keys → Create API Key**
4. Copy the key

---

## Setup — Backend

```bash
cd interview-coach/backend

# 1. Create virtual environment
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# macOS / Linux:
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env and set:  GROQ_API_KEY=your_key_here

# 4. Start the server
uvicorn app.main:app --reload --port 8000
```

The API is now live at **http://localhost:8000**.
Interactive docs: http://localhost:8000/docs

---

## Setup — Frontend

```bash
cd interview-coach/frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open **http://localhost:5173** in Chrome or Edge (required for Web Speech API).

---

## Running the Tests

```bash
cd interview-coach/backend
.\venv\Scripts\Activate.ps1  # or source venv/bin/activate

pytest tests/ -v
```

---

## Usage

1. Open http://localhost:5173 and create an account or sign in
2. From your dashboard, upload your resume PDF (optional) and choose role, type, and difficulty
3. Click **Start Interview**
4. The AI speaks the first question via browser TTS
5. Click the **mic button** to answer by voice (live transcript shown)
   — or switch to **Chat** mode and type your answer
6. After each answer, the AI gives quick feedback and asks the next question
7. When all questions are done, click **View Report** for detailed feedback, scores, and a PDF download
8. Visit **History** to track progress across your account's sessions

Session history and reports are private to the signed-in account. Sign out from the dashboard or interview header.

---

## Built-in guardrails

- Production startup rejects a missing/default or short JWT signing secret; set a unique `SECRET_KEY` (at least 32 characters).
- Registration requires a 4-character password minimum, enforces bcrypt-compatible byte length, and account endpoints are throttled to 10 attempts per IP per minute per backend process.
- Interview starts and answer evaluations are also limited per account to control resource and LLM spend. API request bodies and resume uploads are size-limited. Resume files must be PDFs, unencrypted, at most 10 pages, and extracted text is capped.
- Interview input and generated evaluation/report fields are bounded and schema-validated. Invalid model output is rejected rather than silently converted into scores.
- Model output cannot end an interview before its configured final question; LLM calls have explicit timeouts and retry limits.
- Candidate-provided prompt content is escaped and explicitly treated as untrusted data. Report text is escaped before it is formatted as PDF.
- Interview, history, and report access is authenticated and scoped to the owning account.

For multi-worker or multi-instance production deployments, enforce shared authentication and per-account rate limits at the ingress/API gateway; the built-in limiter is process-local. Terminate TLS at a trusted proxy and configure the proxy to preserve the real client IP correctly.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | — | **Required.** Your Groq API key |
| `APP_ENV` | `development` | Use `production` to enable production secret validation and HSTS |
| `SECRET_KEY` | Development placeholder | **Required in production.** Unique random secret, at least 32 characters |
| `LLM_MODEL` | `llama-3.3-70b-versatile` | Model to use (Groq) |
| `DATABASE_URL` | `sqlite:///./interview_coach.db` | Switch to `postgresql://…` for production |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Sentence-transformers model for RAG |
| `DEFAULT_NUM_QUESTIONS` | `10` | Questions per session |

---

## Swapping the LLM Provider

Edit `backend/app/services/llm.py`. The `get_completion()` and `get_json_completion()` functions are the only place that imports Groq. Replace them with any OpenAI-compatible client and update `LLM_PROVIDER` in `.env`.

---

## Project Structure

```
interview-coach/
├── backend/
│   ├── app/
│   │   ├── main.py           FastAPI app + CORS
│   │   ├── config.py         Pydantic Settings from .env
│   │   ├── models.py         SQLAlchemy models (Session, QAPair, Report)
│   │   ├── schemas.py        Pydantic request/response schemas
│   │   ├── prompts.py        All LLM prompts in one file
│   │   ├── services/
│   │   │   ├── llm.py        Groq client, JSON-mode with retry
│   │   │   ├── resume.py     PDF parsing + chunking
│   │   │   ├── rag.py        FAISS index build + retrieval
│   │   │   ├── speech_analysis.py  Filler words + WPM
│   │   │   └── report.py     Score aggregation + PDF via ReportLab
│   │   ├── graph/
│   │   │   └── interview_graph.py  LangGraph state machine
│   │   └── routes/
│   │       └── interview.py  All API route handlers
│   ├── tests/                pytest: resume, eval schema, speech
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/client.js     Axios wrapper for all API calls
    │   ├── hooks/
    │   │   ├── useSpeechRecognition.js  Web Speech API hook
    │   │   └── useSpeechSynthesis.js    speechSynthesis hook
    │   ├── components/
    │   │   ├── AvatarOrb.jsx     Animated AI avatar
    │   │   ├── MicButton.jsx     Record/stop mic
    │   │   ├── ChatBox.jsx       Text answer input
    │   │   ├── Transcript.jsx    Live STT display
    │   │   ├── Timer.jsx         Per-question countdown
    │   │   ├── SetupForm.jsx     Interview configuration
    │   │   ├── ReportView.jsx    Score charts + Q&A breakdown
    │   │   └── HistoryChart.jsx  Score trend line chart
    │   ├── pages/
    │   │   ├── SetupPage.jsx
    │   │   ├── InterviewPage.jsx
    │   │   ├── ReportPage.jsx
    │   │   └── HistoryPage.jsx
    │   ├── App.jsx
    │   └── main.jsx
    ├── package.json
    ├── vite.config.js
    └── tailwind.config.js
```

---

## Future Improvements (stretch goals)

- **Whisper via Groq** for higher-accuracy STT (especially for non-native accents)
- **ElevenLabs / edge-tts** plug-in for more natural TTS voices
- **Job-description-based question tailoring** (JD field already in the form)
- **Webcam confidence feedback** using MediaPipe (eye contact, posture)
- **Company-style modes** (Google, Amazon STAR, etc.)
- **Malayalam / Hinglish** answer support via Whisper language detection
- **Docker + Render/Railway** deployment config
- **WebSocket streaming** for near-zero-latency question delivery
- **Alembic migrations** for schema evolution in production
