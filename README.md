# Wargame

A real-time web-based wargame map viewer and command tool. Built with:

- **Next.js** frontend, hosted on Vercel at https://umichwargame.vercel.app
- **Django + Channels (Daphne)** backend, hosted on Render at https://umichwargame.onrender.com
- **PostgreSQL** database, hosted on Neon
- **Redis** WebSocket backend, hosted at wss://umichwargame.onrender.com

---

## 🚀 Getting Started

Clone the repository by running:

```bash
git clone https://github.com/UMichWargameDevTeam/Wargame.git    # you can also use SSH
cd Wargame
```

---

## 🧠 Project Structure

```
Wargame/
├── backend/              # Django project (ASGI-enabled with Channels)
├── frontend/             # Next.js frontend
├── Makefile              # Easy commands for running dev servers
└── .env                  # gitignore'd. Info on what it contains below
```

---

## ⚙️ Prerequisites

- Python 3.10+ with virtualenv
- Node.js 18+ and npm
- Make (preinstalled on macOS and most Linux systems)

---

## 🐍 Backend Setup

In the ``Wargame/`` directory, run:

```bash
python3 -m venv env
source env/bin/activate  # or env\Scripts\activate on Windows
cd backend
pip install -r requirements.txt
python3 manage.py collectstatic
```

---

## .env file Setup

In the root of the project, create a file named .env with the following structure:

```
# Generate with $ openssl rand -base64 48
SECRET_KEY='your Django secret key here'
# See Database Setup step for how to obtain this URL
DATABASE_URL='your neon database connection url'
# Should be True in development, False in production
DEBUG=True
# The rest of the keys should only be specified in production, and omitted in development
NEXT_PUBLIC_BACKEND_URL='your backend server URL here'
NEXT_PUBLIC_WS_URL='your WebSocket server URL here'
# Will be emailed in production when there are internal server errors
ADMINS='example:example@gmail.com'
# Credentials of the email that will be used to send emails to admins when there are internal server errors
EMAIL_HOST_USER='example@gmail.com'
# Obtained by generating an app password in google account settings
EMAIL_HOST_PASSWORD='your password here'
```

---

## 🛢 Database Setup

We used Neon for our project. Here's instructions on how to set up a Neon database:

1. Go to https://neon.com/
2. Make a Neon account/organization
3. In the projects tab, click ``Create project``.
4. Name the project
5. If you are not already there, go to the project's dashboard by clicking ``Dashboard`` in the sidebar.
6. Click ``Connect``
7. From one of the dropdowns (whose default value is ``psql``), select ``Django``

To get the connection string to be pasted in the .env file ``Setup step``:

8. Click ``Show password``
9. Click ``Copy snippet``

---

## 🌐 Frontend Setup

In the ``Wargame/`` directory, run:

```bash
cd frontend
npm install
```

---

## 🧪 Running the project- Makefile Commands

First, make sure the virtual environment is activated (demonstrated in ``Backend setup`` step).

Then inside the ``Wargame/`` directory, run

```bash
make both
```

See the Makefile for more options.

---

## 📄 License

TBD
