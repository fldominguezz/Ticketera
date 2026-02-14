.PHONY: help install start stop restart logs backup shell-backend

help:
	@echo "Comandos disponibles para Ticketera SOC:"
	@echo "  make install   - Configura el entorno inicial (.env)"
	@echo "  make start     - Levanta todos los servicios en segundo plano"
	@echo "  make stop      - Detiene todos los servicios"
	@echo "  make restart   - Reinicia los servicios"
	@echo "  make logs      - Muestra logs en tiempo real"
	@echo "  make backup    - Ejecuta el script de respaldo de base de datos"
	@echo "  make clean     - Limpia recursos de Docker no utilizados"

install:
	test -f .env || cp .env.example .env
	@echo "Archivo .env creado. Por favor, edítelo antes de continuar."

start:
	docker-compose up -d --build

stop:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

backup:
	./scripts/infra/daily_backup.sh

clean:
	docker system prune -f
