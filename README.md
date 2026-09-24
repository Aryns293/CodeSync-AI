# CodeSync AI

> **AI-Assisted Real-Time Collaborative IDE**

A collaborative online IDE that enables multiple developers to code together in real time, execute programs in multiple languages, and leverage AI-powered code reviews for better code quality and productivity.

# 🌐 Live Demo

**Application:** https://codesync-ai-l5xe.onrender.com

---

# 📝 Introduction

CodeSync AI is a real-time collaborative Integrated Development Environment (IDE) featuring a stunning, premium glassy UI with real-time code synchronization. It allows multiple users to work on the same codebase simultaneously.

Developers can create user accounts, manage shared coding rooms, edit code together, execute programs instantly, and receive AI-powered code reviews for optimization, readability improvements, and bug detection.

The platform supports multiple programming languages and provides a seamless collaborative experience using WebSockets.

---

# 🚀 Features

## 🧑‍💻 Real-Time Collaboration

- **Yjs CRDT Architecture:** Live code synchronization powered by Conflict-Free Replicated Data Types (CRDTs), designed to merge concurrent edits safely.
- **Efficient Sync:** Sends compact binary document updates instead of repeatedly broadcasting the full file.
- Instant collaboration powered by Socket.IO, with MongoDB-backed room state hydration.

---

## 💡 AI Code Review

- Integrated Gemini API (current `@google/genai` SDK).
- Detects potential bugs.
- Suggests optimizations.
- Improves readability.
- Recommends best coding practices.
- Reviews use the room's actual selected language instead of guessing from the code.

---

## ⚙️ Multi-Language Code Execution

Executes code in a locked-down, single-use Docker container per run (network disabled, memory/CPU/process limits, non-root user). 
Features robust execution timeout management:
- **Explicit Lifecycle:** Containers are uniquely named upfront.
- **Orphan Prevention:** On timeout, the system explicitly terminates the specific container and verifies its removal, preventing dangling processes and resource leaks on the host.
- **Fallback:** Automatic fallback to JDoodle if Docker isn't available on the host.

Supported languages:

- C++
- Python 3
- Java
- JavaScript (Node.js)

---

## 📡 Room Management

- Create coding rooms.
- Join using a Room ID.
- Real-time participant synchronization.
- Automatic room communication through WebSockets.

---

## 🌐 Modern Tech Stack & Premium UI

- Stunning, responsive "glassmorphism" React frontend
- Node.js/Express backend with MongoDB persistence
- JWT-based User Authentication & Authorization
- Socket.IO based real-time communication
- AI-powered code analysis using Gemini
- Dockerized code execution with a resilient fallback path

---

# 🏗️ High-Level Architecture

- Clients connect to the backend using WebSockets.
- Socket.IO synchronizes editor changes across all connected users.
- Socket.IO event payloads are validated server-side before they can join rooms, change language, update CRDT state, run code, or request AI review.
- Code execution runs through a two-path strategy:
  - **Local / self-hosted:** Each run spawns a locked-down, single-use Docker container (`docker run --name <uuid> --network none ...`). Containers are explicitly named, SIGKILL-ed on timeout, verified exited, then removed — no orphaned containers.
  - **Render demo (live URL):** Render's standard web service tier cannot spawn sibling Docker containers. The deployed demo always falls back to JDoodle automatically. If you want to exercise the Docker path, run the project locally with Docker installed.
- AI review requests are processed using the Gemini API.
- Room access uses a UUID link-share model (anyone with the UUID can join and edit — intentional Google-Docs-style design).

---

# 🛠️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React.js, TailwindCSS, Framer Motion, Socket.IO Client, Yjs, y-monaco |
| **Backend** | Node.js, Express.js, Socket.IO, Yjs, MongoDB, Mongoose, JWT, Zod |
| **AI** | Gemini API (`@google/genai`) |
| **Code Execution** | Docker sandbox (local/self-hosted), JDoodle API (Render demo + fallback) |
| **Others** | Axios, Vite, Nodemon |

---

# 🔧 Local Setup

## 1. Clone the repository

```bash
git clone <your-repo-url>
cd CodeSync-AI
```

## 2. Install dependencies

```bash
npm install                # backend deps, from project root
cd frontend && npm install # frontend deps
cd ..
```

## 3. Configure environment variables

```bash
cp .env.example .env               # root - add MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET; add GEMINI_API_KEY for AI review
cd frontend && cp .env.example .env && cd ..
```

See the tables below for what each variable does.

## 4. Build the execution sandbox image

```bash
docker build -t realtime-ide-sandbox ./backend/execution-image
```

## 5. Start the backend

```bash
npm run dev                 # nodemon, serves on :5001
```

## 6. Start the frontend

```bash
cd frontend
npm run dev                 # opens on :5173
```

### Environment variables

| Variable | Where | Required? | Purpose |
|---|---|---|---|
| `MONGODB_URI` | root `.env` | **Yes** | MongoDB connection string — server crashes at startup without this |
| `JWT_SECRET` | root `.env` | **Yes** | Signs access tokens (15 min TTL) — server crashes at startup without this |
| `JWT_REFRESH_SECRET` | root `.env` | **Yes** | Signs refresh tokens (7 day TTL) — server crashes at startup without this |
| `GEMINI_API_KEY` | root `.env` | Optional | Gemini API key. AI review is disabled without it, but the server still starts |
| `JDOODLE_CLIENT_ID` | root `.env` | Optional | JDoodle fallback execution — required if Docker is unavailable |
| `JDOODLE_CLIENT_SECRET` | root `.env` | Optional | JDoodle fallback execution — required if Docker is unavailable |
| `USE_DOCKER_SANDBOX` | root `.env` | Optional | Set to `false` to always use JDoodle instead of Docker |
| `ALLOWED_ORIGINS` | root `.env` | Optional | Comma-separated list of allowed CORS origins. **Required in production** to prevent open CORS. |
| `VITE_BACKEND_URL` | `frontend/.env` | Optional | Points local frontend at local backend (defaults to same-origin) |

---

# 📂 Project Structure

```text
.
├── backend/
│   ├── index.js
│   ├── src/
│   │   ├── controllers/      # Auth and Room REST handlers
│   │   ├── middlewares/      # JWT Auth and Rate Limiting
│   │   ├── models/           # User and Room MongoDB Schemas
│   │   ├── routes/           # Express API Routes
│   │   ├── services/         # Execution (Docker/JDoodle), Gemini, auth helpers
│   │   └── sockets/          # Socket handlers (collaboration, execution, room), state, auth, persistence
│   └── execution-image/      # Dockerfile for sandboxes
├── frontend/
│   ├── src/
│   │   ├── components/       # UI Components (Navbar, etc)
│   │   ├── features/         # Feature modules (AuthContext, Workspace, etc)
│   │   ├── pages/            # Landing, Login, Register, Dashboard, Workspace
│   │   └── index.css         # Global styles and grid patterns
│   └── package.json
├── .env.example
├── package.json
└── README.md
```

---

# ⚖️ Known Architecture Trade-offs

These are intentional portfolio-scope decisions. Each has a known production-grade fix.

| Trade-off | Current Behaviour | Production Fix |
|---|---|---|
| **Single refresh token per user** | Logging in on a second device overwrites the stored token, silently killing the first device's session within 15 min | Per-device session array (store `[{ token, deviceId, issuedAt }]`) |
| **No global Docker concurrency cap** | Per-socket 3 s throttle prevents rapid reuse from one tab; multiple tabs/scripts can still spawn parallel containers | Add a host-wide semaphore counter (e.g. `p-limit`) to cap simultaneous Docker spawns |
| **ExecutionLog is write-only** | Every run is logged (code + output), but nothing reads the collection yet. 30-day TTL index prevents unbounded growth | Build a run-history UI, or drop the model entirely if audit history is not needed |
| **Room access = UUID = access** | Any authenticated user who knows/guesses the UUID can join and edit — intentional, not an oversight | Add a membership model or owner-only invite system for private rooms |

# 📈 Future Improvements

- AI review scoring and severity levels
- Per-device session management
- CI Pipeline (GitHub Actions)
- File explorer supporting multiple source files
- Run-history UI backed by ExecutionLog

---

# 👨‍💻 Author

**Aryan Sharma**

B.Tech, Delhi Technological University

- **GitHub:** https://github.com/Aryns293
- **LinkedIn:** https://www.linkedin.com/in/aryan-sharma-29m/
