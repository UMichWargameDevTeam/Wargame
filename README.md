# LongTermWargame

A real-time web-based wargame map viewer and command tool. Built with:

- **Next.js** frontend, hosted on Vercel at https://umichwargame.vercel.app
- **Django + Channels (Daphne)** backend, hosted on Render at https://umichwargame.onrender.com
- **PostgreSQL** database, hosted on Neon
- **Redis** WebSocket backend, hosted at wss://umichwargame.onrender.com

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
├── .env                  # gitignore'd. Info on what it contains below
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
# Generate with $ openssl rand -base64 48
SECRET_KEY='your django secret key here'
# Obtained by going to the Neon project's dashboard, clicking Connect, selecting Django, enable Connection Pooling, and looking at the .env tab
DATABASE_URL='your neon database connection url, with connection pooling enabled, here'
# Should be True in development, False in production
DEBUG=True
# These two should only be specified in production, and omitted in development
NEXT_PUBLIC_BACKEND_URL='your backend server URL here'
NEXT_PUBLIC_WS_URL='your WebSocket server URL here'
# Will be emailed in production when there are internal server errors
ADMINS='examplename:example@gmail.com,examplename2:example2@gmail.com'
# Credentials of the email that will be used to send emails to admins when there are internal server errors
# These are only necessary in production.
EMAIL_HOST_USER='example3@gmail.com'
# Obtained by generating an app password in google account settings
EMAIL_HOST_PASSWORD='your password here'
```

---

## 🔗 Access

- **Frontend app**: http://localhost:3000
- **Backend WebSocket endpoint**: ws://localhost:8000/ws/<join_code>/main-map/

---

## 💡 Role System

- `/roleselect` shows a role selector.
- After role selection, users are redirected to `/game-instances/<join_code>/main-map/`, where the map is shown and role-specific UI can be rendered.
- Users may only sign up for one role per game. They cannot sign up for a new role in a game unless a Gamemaster deletes their old role.

---

## 📡 WebSocket Messaging

WebSocket code is included in the frontend. It supports:

- Bi-directional real-time messaging
- Broadcast to connected devices
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
