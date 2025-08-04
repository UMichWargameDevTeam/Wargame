.PHONY: frontend backend both

front:
	cd frontend && npm run dev

back:
	cd backend/wargamebackend && daphne -b 127.0.0.1 -p 8000 wargamebackend.asgi:application

redis:
	redis-server --daemonize yes

both:
	make redis
	make front & \
	make back
