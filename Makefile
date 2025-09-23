.PHONY: check-venv redis backend frontend all

check-venv:
	@if [ -z "$$VIRTUAL_ENV" ]; then \
		echo "❌ No virtual environment detected. Please activate one first."; \
		exit 1; \
	fi

redis:
	redis-server --loglevel notice

backend: check-venv	
	cd backend && python -u -m daphne -b 127.0.0.1 -p 8000 wargamebackend.asgi:application

frontend:
	cd frontend && npm run dev

all: check-venv
	npx concurrently "make redis" "make backend" "make frontend"