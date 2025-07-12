Open two seperate terminals

Backend:
Run: cd wargamebackend -> daphne wargamebackend.asgi:application
Sometimes you'll have to update the database when new models are added:
1. python3 manage.py makemigrations
2. python3 manage.py migrate

Frontend:
Run: cd frontend -> npm run dev