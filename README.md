# LongTermWargame

A real-time web-based wargame map viewer and command tool. Built with:

- **Next.js** frontend, hosted on Vercel at https://long-term-wargame.vercel.app
- **Django + Channels (Daphne)** backend, hosted on Render
- **PostgreSQL** database, hosted on Neon
- WebSocket support for live communication between roles/devices, hosted on redis cloud

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
- Make (preinstalled on macOS and most Linux systems)

---

## 🐍 Backend Setup

```bash
python -m venv env
source env/bin/activate  # or env\Scripts\activate on Windows
pip install -r backend/requirements.txt
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
```

To run the frontend:

```
npm run dev
```

or use

```bash
make front
```

---

## .env file Setup

In the root of the project, create a file named .env with the following structure:

```
# Initially obtained from backend/wargamebackend/wargamebackend/settings.py
SECRET_KEY='your django secret key here'
# Obtained by going to the Neon project's dashboard, clicking Connect, selecting Django, enable Connection Pooling, and looking at the .env tab
DATABASE_URL='your neon database connection url, with connection pooling enabled, here'
# Should be True in development, False in production
DEBUG=True
```

---

## 🔗 Access

- **Frontend app**: http://localhost:3000
- **Backend WebSocket endpoint**: ws://localhost:8000/ws/<join_code>/mainmap/

---

## 💡 Role System

- The root page (`/`) shows a role selector.
- When a user selects a role (Commander, Observer, Field Unit), it's stored in `sessionStorage`.
- This allows each device/tab to act independently.
- After role selection, users are redirected to `/game-instances/<join_code>/mainmap/`, where the map is shown and role-specific UI can be rendered.

---

## 📡 WebSocket Messaging (Optional)

WebSocket code is included but currently disabled in the frontend. It supports:

- Bi-directional real-time messaging via `/ws/game-instances/<join_code>/mainmap/`
- Broadcast to all connected devices
- Handled by Django Channels + Daphne using ASGI

---

## 🧪 Makefile Commands

Use these from the root of the project:

```bash
make backend     # Run Daphne ASGI backend
make frontend    # Run Next.js frontend
make both        # Run both in parallel (UNIX/macOS only). Probably the one you'll use most
```

---

## 📄 License

TBD
