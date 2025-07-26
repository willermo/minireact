.PHONY: help start-dev start-prod start-both stop-dev stop-prod stop-both build-dev build-prod logs-dev logs-prod prune certs

# Usage:
#   make start-dev            # Start dev environment (https://localhost:4433)
#   make start-prod           # Start prod environment (https://localhost:4443)
#   make start-both           # Start both environments
#   make stop-dev             # Stop dev environment
#   make stop-prod            # Stop prod environment
#   make stop-both            # Stop both environments
#   make build-dev            # Build dev images
#   make build-prod           # Build prod images
#   make logs-dev             # Show logs for dev
#   make logs-prod            # Show logs for prod
#   make shell-backend-dev    # Open shell in dev backend
#   make shell-frontend-dev   # Open shell in dev frontend
#   make shell-nginx-dev      # Open shell in dev nginx
#   make shell-backend-prod   # Open shell in prod backend
#   make shell-frontend-prod  # Open shell in prod frontend
#   make shell-nginx-prod     # Open shell in prod nginx
#   make shell-dev            # Open shell in dev backend (alias)
#   make shell-prod           # Open shell in prod backend (alias)
#   make prune                # Clean up stopped containers, networks, images
#   make certs                # Generate self-signed certs for nginx (interactive)

# Export UID/GID for Docker to use (avoids permission issues)
export UID := $(shell id -u)
export GID := $(shell id -g)

start-prod:
	docker compose -f docker-compose.prod.yml -p testapp up --build -d
	@echo ""
	@echo "===================================================="
	@echo "  URL: https://localhost:4443"
	@echo "  Note: Self-signed certificates are now generated during build"
	@echo "===================================================="

start-dev:
	@if [ ! -f nginx/certs/fullchain.pem ] || [ ! -f nginx/certs/privkey.pem ]; then \
		echo "Nginx certificates not found. Generating..."; \
		$(MAKE) certs; \
	fi
	@echo "Installing backend dependencies..."
	@cd backend && npm install
	@echo "Installing frontend dependencies..."
	@cd frontend && npm install
	docker compose -f docker-compose.dev.yml -p testapp-dev up --build -d
	@echo ""
	@echo "===================================================="
	@echo "  Backend:  Not exposed - proxied from vite or nginx"
	@echo "  Frontend direct:    https://localhost:5173"
	@echo "  Frontend via nginx: https://localhost:4433"
	@echo "===================================================="

start-both:
	$(MAKE) start-dev
	$(MAKE) start-prod

stop-dev:
	docker compose -f docker-compose.dev.yml -p testapp-dev down

stop-prod:
	docker compose -f docker-compose.prod.yml -p testapp down

stop-both:
	$(MAKE) stop-dev
	$(MAKE) stop-prod

build-dev:
	docker compose -f docker-compose.dev.yml -p testapp-dev build

build-prod:
	docker compose -f docker-compose.prod.yml -p testapp build

logs-dev:
	docker compose -f docker-compose.dev.yml -p testapp-dev logs -f

logs-prod:
	docker compose -f docker-compose.prod.yml -p testapp logs -f

# Development shell access
shell-backend-dev:
	docker compose -f docker-compose.dev.yml -p testapp-dev exec backend /bin/sh

shell-frontend-dev:
	docker compose -f docker-compose.dev.yml -p testapp-dev exec frontend /bin/sh

shell-nginx-dev:
	docker compose -f docker-compose.dev.yml -p testapp-dev exec nginx /bin/sh

# Production shell access
shell-backend-prod:
	docker compose -f docker-compose.prod.yml -p testapp exec backend /bin/sh

shell-frontend-prod:
	docker compose -f docker-compose.prod.yml -p testapp exec frontend /bin/sh

shell-nginx-prod:
	docker compose -f docker-compose.prod.yml -p testapp exec nginx /bin/sh

# Shortcut aliases
shell-dev: shell-backend-dev
shell-prod: shell-backend-prod

# Testing commands for container permissions
test-permissions-dev:
	@echo "\033[1;33mTesting user permissions in development containers...\033[0m"
	docker compose -f docker-compose.dev.yml -p testapp-dev exec backend id
	docker compose -f docker-compose.dev.yml -p testapp-dev exec frontend id
	docker compose -f docker-compose.dev.yml -p testapp-dev exec nginx id
	@echo "\033[1;32mPermission test completed\033[0m"

test-permissions-prod:
	@echo "\033[1;33mTesting user permissions in production containers...\033[0m"
	docker compose -f docker-compose.prod.yml -p testapp exec backend id
	docker compose -f docker-compose.prod.yml -p testapp exec frontend id
	docker compose -f docker-compose.prod.yml -p testapp exec nginx id
	@echo "\033[1;32mPermission test completed\033[0m"

# Test file ownership in mounted volumes
test-file-ownership-dev:
	@echo "\033[1;33mTesting file ownership in development mounted volumes...\033[0m"
	@echo "Creating test files in mounted directories..."
	docker compose -f docker-compose.dev.yml -p testapp-dev exec backend sh -c "touch /app/data/test_file_backend && ls -la /app/data/test_file_backend"
	docker compose -f docker-compose.dev.yml -p testapp-dev exec frontend sh -c "touch /app/dist/test_file_frontend && ls -la /app/dist/test_file_frontend"
	@echo "\033[1;32mNow check host ownership of these files with: ls -la backend/data/test_file_backend frontend/dist/test_file_frontend\033[0m"

# Comprehensive permission and ownership test
test-permissions: test-permissions-dev test-permissions-prod test-file-ownership-dev

# Complete test flow - prune, rebuild, and test
test-flow:
	@echo "\033[1;36mStarting complete test flow...\033[0m"
	@echo "\033[1;33mStep 1: Pruning existing containers...\033[0m"
	$(MAKE) prune
	@echo "\033[1;33mStep 2: Building development containers...\033[0m"
	$(MAKE) build-dev
	@echo "\033[1;33mStep 3: Starting development containers...\033[0m"
	$(MAKE) start-dev
	@echo "\033[1;33mStep 4: Waiting for containers to initialize (15 seconds)...\033[0m"
	sleep 15
	@echo "\033[1;33mStep 5: Running permission tests...\033[0m"
	$(MAKE) test-permissions-dev
	$(MAKE) test-file-ownership-dev
	@echo "\033[1;32mTest flow completed successfully!\033[0m"
	@echo "Use 'make logs-dev' to see container logs if needed."

prune:
	@echo "Removing all testapp containers, networks, and volumes..."
	docker compose -f docker-compose.dev.yml -p testapp-dev down --volumes --remove-orphans
	docker compose -f docker-compose.prod.yml -p testapp down --volumes --remove-orphans
	@echo "Removing testapp-related dangling images..."
	docker image prune -f --filter "label=com.docker.compose.project=testapp-dev" 
	docker image prune -f --filter "label=com.docker.compose.project=testapp"
	@echo "Clean-up complete"

certs: nginx-certs ensure-backend-certs-dir

# Generate nginx certificates
nginx-certs:
	@echo "Generating self-signed certs for nginx..."
	mkdir -p nginx/certs
	openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
	  -keyout nginx/certs/privkey.pem \
	  -out nginx/certs/fullchain.pem \
	  -subj "/C=IT/ST=Lazio/L=Rome/O=TrashAndDanceTeam/CN=127.0.0.1"
	chmod 600 nginx/certs/privkey.pem
	chmod 644 nginx/certs/fullchain.pem
	chmod 700 nginx/certs
	@echo "Certs created in nginx/certs with secure permissions. Distribute fullchain.pem to clients if needed."

# Just ensure backend certs directory exists
# The actual certificate generation will be handled by backend/scripts/ensure-certificates.sh
# which is more robust with validity checks and automatic regeneration
ensure-backend-certs-dir:
	@echo "Ensuring backend certs directory exists..."
	mkdir -p backend/certs
	@echo "Backend certs will be generated automatically by container script."
