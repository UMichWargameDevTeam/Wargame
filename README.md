# Wargame

A real-time web-based wargame map-viewer and command tool. Built with:

- **PostgreSQL** database, hosted on Neon
- **Redis** WebSocket backend, hosted on Redis Cloud
- **Django + Channels (Daphne)** backend, hosted on Render at https://umichwargame.onrender.com
- **Next.js** frontend, hosted on Vercel at https://umichwargame.vercel.app

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
├── backend/              # Django project backend (ASGI-enabled with Channels)
├── frontend/             # Next.js frontend
├── Makefile              # Easy commands for running dev servers
└── .env                  # gitignore'd file containing environment variables. More specific information below.
```

---

## 📋 Prerequisites

- Python 3.10+ with virtualenv
- Node.js 18+ and npm
- Make (preinstalled on macOS and most Linux systems)
- redis-server

These can be installed using package managers such as ``apt`` on Ubuntu or ``brew`` on MacOS.

---

## ⚙️ Setup

### 🛢 Database Setup (production only)

We used Neon to host a PostgreSQL database for our project. Here are instructions on how to set it up:

1. Go to https://neon.com/ and sign up/log in
2. In the dashboard’s ``Projects`` tab, click ``New project``.
3. Choose a ``Project name``
4. Select the ``Region`` closest to where you live
5. Click ``Create``

To get the connection string to be pasted in the ``.env file Setup``:

6. In the project's dashboard, click ``Connect``
7. In the dropdown whose default value is ``psql``, select ``Django``
8. Click ``Show password``
9. Click ``Copy snippet``

### 🔌 WebSocket Server Setup (production only)

We used Redis Cloud to host a WebSocket server for our project. Here are instructions on how to set it up:

1. Go to https://redis.io/cloud/ and sign up/log in
2. In the dashboard’s ``Databases`` tab, click ``New database``
3. Select the free plan
4. Choose a ``Name``
5. Select the ``Region`` closest to where you live
6. Click ``Create database``

To get the connection string to be pasted in the ``.env file Setup``:

7. In the project’s dashboard, click ``Connect``
8. Click ``Redis CLI``
9. Click ``Copy``
10. When pasting, only include the part that starts with ``redis://``

### 🗝️ .env file Setup

In the root of the project (i.e. ``Wargame/``), create a file named .env with the following structure:

```
# Should be True in development, False in production
DEBUG=True
# Generate with $ openssl rand -base64 48
SECRET_KEY='your Django secret key here'

# The rest of the environment variables should only be included in production, when DEBUG is False
# See Database Setup for how to obtain this URL
DATABASE_URL='your Neon database connection URL here'
# See WebSocket Server Setup for how to obtain this URL
REDIS_URL='your Redis Cloud WebSocket connection URL here'
NEXT_PUBLIC_WS_URL='your public WebSocket URL here'
NEXT_PUBLIC_BACKEND_URL='your backend server URL here'
NEXT_PUBLIC_FRONTEND_URL='your frontend URL here'
# Will be emailed in production when there are internal server errors
ADMINS='example:example@gmail.com'
# Credentials of the email that will be used to send emails to admins when there are internal server errors
EMAIL_HOST_USER='example@gmail.com'
# Obtained by generating an app password in google account settings
EMAIL_HOST_PASSWORD='your password here'
```

### 🐍 Backend Setup

In the root of the project, run:

```bash
python3 -m venv env     # create a virtual environment
source env/bin/activate  # or env\Scripts\activate on Windows. This is how to activate your virtual environment
cd backend
touch db.sqlite3    # create a SQLite database for development
pip install -r requirements.txt
python3 manage.py collectstatic
python3 manage.py migrate
python3 manage.py populate_data seed_data.json
```

For production, re-run the last two commands with DEBUG set to False to populate the production database as well.

### 🌐 Frontend Setup

In the root of the project, run:

```bash
cd frontend
npm install
```

---

## 🧪 Running the project

First, make sure the virtual environment is activated (see ``Backend setup`` for how to do this).

Then in the root of the project, run

```bash
make all
```

Go to http://localhost:3000 to access the frontend during development.
Go to http://localhost:8000 to access the backend during development.

Press Ctrl + C to stop running the project.

See the Makefile for more options.

---

## 📄 License

TBD
