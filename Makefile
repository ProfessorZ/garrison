.PHONY: up down logs migrate shell

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f

migrate:
	docker compose exec backend alembic upgrade head

shell:
	docker compose exec backend bash
