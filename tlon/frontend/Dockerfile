###############
#             #
# Build stage #
#             #
###############
FROM node:20-slim AS builder
WORKDIR /app

# Install curl for healthcheck reliability
RUN apt-get update && apt-get install -y curl

# Install dependencies first (better layer caching)
COPY ./frontend/package*.json ./
RUN npm ci

# Copy application code
COPY ./frontend/ ./

# Generate SSL certificates for HTTPS (required by vite config)
RUN mkdir -p certs && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout certs/frontend.key \
      -out certs/frontend.crt \
      -subj "/C=${SSL_CERT_COUNTRY}/ST=${SSL_CERT_STATE}/L=${SSL_CERT_CITY}/O=${SSL_CERT_ORGANIZATION}/CN=${SSL_CERT_COMMON_NAME}"

# Build static assets
RUN npm run build

# Ensure the public directory is copied to dist
RUN mkdir -p dist && \
    cp -r public/* dist/ 2>/dev/null || :


#####################
#                   #
# Development stage #
#                   #
#####################
FROM node:20-slim AS dev
WORKDIR /app

# Install curl for healthcheck reliability
RUN apt-get update && apt-get install -y curl

# Copy necessary scripts for permission checks
COPY frontend/scripts /app/scripts
RUN chmod +x /app/scripts/*.sh 2>/dev/null || true

# Copy package files first (better layer caching)
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Create a non-privileged user that matches external UID/GID
# This will be overridden by the docker-compose user setting
USER node
EXPOSE 5173
CMD ["npm", "run", "dev"]
