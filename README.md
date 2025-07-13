# LongTermWargame

A real-time web-based wargame map viewer and command tool. Built with:

- **Next.js** frontend
- **Django + Channels (Daphne)** backend
- WebSocket support for live communication between roles/devices

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/LongTermWargame.git
cd LongTermWargame
```

---

## 🧠 Project Structure

```
LongTermWargame/
├── backend/              # Django project (ASGI-enabled with Channels)
│   └── wargamebackend/
├── frontend/             # Next.js frontend
├── Makefile              # Easy commands for running dev servers
```

---

## ⚙️ Prerequisites

- Python 3.10+ with virtualenv
- Node.js 18+ and npm
- Daphne (`pip install daphne`)
- Make (preinstalled on macOS and most Linux systems)

---

## 🐍 Backend Setup

```bash
cd backend/wargamebackend
python -m venv env
source env/bin/activate  # or env\Scripts\activate on Windows
pip install -r requirements.txt
```

To run the backend (ASGI server):

```bash
make back
```

> Make sure you run this from the project root (`LongTermWargame/`).

---

## 🌐 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Or use:

```bash
make front
```

---

## ▶️ Run Both at Once (macOS/Linux only)

```bash
make both
```

> This runs both the backend (Daphne) and frontend (Next.js) in parallel in one terminal.

---

## 🔗 Access

- **Frontend app**: http://localhost:3000
- **Backend WebSocket endpoint**: ws://localhost:8000/ws/mainmap/

---

## 💡 Role System

- The root page (`/`) shows a role selector.
- When a user selects a role (Commander, Observer, Field Unit), it's stored in `sessionStorage`.
- This allows each device/tab to act independently.
- After role selection, users are redirected to `/mainmap`, where the map is shown and role-specific UI can be rendered.

---

## 📡 WebSocket Messaging (Optional)

WebSocket code is included but currently disabled in the frontend. It supports:

- Bi-directional real-time messaging via `/ws/mainmap/`
- Broadcast to all connected devices
- Handled by Django Channels + Daphne using ASGI

---

## 🧪 Makefile Commands

Use these from the root of the project:

```bash
make backend     # Run Daphne ASGI backend
make frontend    # Run Next.js frontend
make dev         # Run both in parallel (UNIX/macOS only)
```

---

## 📄 License

TBD
