.PHONY: frontend backend dev

front:
	cd frontend && npm run dev

back:
	cd backend/wargamebackend && daphne -b 127.0.0.1 -p 8000 wargamebackend.asgi:application

both:
	(cd frontend && npm run dev) & \
	(cd backend/wargamebackend && daphne -b 127.0.0.1 -p 8000 wargamebackend.asgi:application)
