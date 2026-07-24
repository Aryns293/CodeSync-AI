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

- Create and join shared coding rooms.
- Live code synchronization across all connected users.
- Instant updates powered by Socket.IO.

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

Executes code in a locked-down, single-use Docker container per run (network disabled, memory/CPU/process limits, non-root user, execution timeout) - with an automatic fallback to Judge0 if Docker isn't available on the host.

Supported languages:

- C++
- Python
- Java

---

## 📡 Room Management

- Create private coding rooms.
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
- Code execution requests run in an isolated Docker container (`docker run --network none ...`); if no Docker daemon is reachable, requests fall back to the Judge0 API automatically.
- AI review requests are processed using the Gemini API.

---

# 🛠️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React.js, TailwindCSS, Framer Motion, Socket.IO Client |
| **Backend** | Node.js, Express.js, Socket.IO, MongoDB, Mongoose, JWT, Zod |
| **AI** | Gemini API (`@google/genai`) |
| **Code Execution** | Docker (primary), JDoodle (fallback) |
| **Others** | Axios, Vite, Nodemon, PM2 (production) |

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
cp .env.example .env               # root - add GEMINI_API_KEY (required)
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
| `GEMINI_API_KEY` | root `.env` | Yes | AI Review |
| `RAPIDAPI_KEY` | root `.env` | Optional | Judge0 fallback if Docker isn't available |
| `USE_DOCKER_SANDBOX` | root `.env` | Optional | Set to `false` to always use Judge0 |
| `SELF_PING_URL` | root `.env` | Optional | Prevents a free-tier host from sleeping, once deployed |
| `VITE_BACKEND_URL` | `frontend/.env` | Optional | Points local frontend at local backend |

---

# 📂 Project Structure

```text
.
├── backend/
│   ├── index.js
│   ├── src/
│   │   ├── controllers/      # Auth, Room, AI, and Execution logic
│   │   ├── middlewares/      # JWT Auth and Rate Limiting
│   │   ├── models/           # User and Room MongoDB Schemas
│   │   ├── routes/           # Express API Routes
│   │   └── services/         # Execution (Docker/JDoodle) & Gemini services
│   └── execution-image/      # Dockerfile for sandboxes
├── frontend/
│   ├── src/
│   │   ├── components/       # UI Components (Navbar, etc)
│   │   ├── context/          # Auth Context
│   │   ├── pages/            # Landing, Login, Register, Dashboard, Workspace
│   │   └── index.css         # Global styles and grid patterns
│   └── package.json
├── .env.example
├── package.json
└── README.md
```

---

# 📈 Future Improvements

- AI review scoring and severity levels
- Collaborative cursors
- Automated tests + CI
- File explorer supporting multiple source files

---

# 👨‍💻 Author

**Aryan Sharma**

B.Tech, Delhi Technological University

- **GitHub:** https://github.com/Aryns293
- **LinkedIn:** https://www.linkedin.com/in/aryan-sharma-29m/
