# Frontend Environment Variables & Docker Usage

## .env Usage
- Place your frontend environment variables in `frontend/.env` (for development) or `frontend/.env.production` (for production builds).
- **Vite convention:** All variables must be prefixed with `VITE_` to be exposed to the client (e.g., `VITE_API_BASE=https://your-lan-ip:4433/api`).
- The correct `.env` file will be picked up automatically by Vite during build/dev.

## Vite Proxy for /api (Development)

- The Vite dev server is configured to proxy all `/api` requests to the backend via nginx (see `vite.config.ts`).
- This allows you to use relative API calls (`/api/...`) in your frontend code with no CORS issues.
- The proxy target is set to `https://localhost:4433` (the dev nginx HTTPS endpoint).
- The `secure: false` option allows use of self-signed certificates in development.

**Example usage in your frontend code:**
```ts
fetch('/api/auth/status') // Will be proxied to backend via nginx in dev
```

## Dockerfile Usage
- **Production build:**
  - Uses multi-stage build: Node.js for building, nginx for serving static files.
  - Expects built assets in `/usr/share/nginx/html`.
  - nginx config and certs are copied from `../nginx` (relative to frontend directory).
- **Development:**
  - Uses Node.js and runs `npm run dev` (Vite dev server, hot reload).
  - Exposes port 5173 by default (can be mapped in Compose).

## Compose Integration
- Both dev and prod Compose files mount/copy the correct `.env` and code as needed.
- For production, only the built assets are needed, not the source code.

## Makefile Usage

A project-level `Makefile` provides simple commands for starting, stopping, building, and managing both development and production environments using Docker Compose.

### Common Commands
- `make start-dev`   — Start development environment (https://localhost:4433)
- `make start-prod`  — Start production environment (https://localhost:4443)
- `make start-both`  — Start both environments simultaneously
- `make stop-dev`    — Stop development environment
- `make stop-prod`   — Stop production environment
- `make stop-both`   — Stop both environments
- `make build-dev`   — Build dev images
- `make build-prod`  — Build prod images
- `make logs-dev`    — Show logs for dev
- `make logs-prod`   — Show logs for prod
- `make prune`       — Clean up stopped containers, networks, and volumes
- `make certs`       — Generate self-signed certificates for nginx

See the top of the `Makefile` for more details and usage examples.

## Example .env
```
VITE_API_BASE=https://localhost:4443/api
```
