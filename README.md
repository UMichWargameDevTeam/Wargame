Run: cd wargamebackend -> python3 manage.py runserver
Sometimes you'll have to update the database when new models are added:
1. python3 manage.py makemigrations
2. python3 manage.py migrate