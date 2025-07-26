###############
#             #
# Build stage #
#             #
###############
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY ./backend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY ./backend/ ./

# Build the application
RUN npm run build


####################
#                  #
# Production stage #
#                  #
####################
FROM node:20-slim AS production

WORKDIR /app

# Install OpenSSL for certificate generation
RUN apt-get update && apt-get install -y --no-install-recommends openssl curl && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create directories with appropriate permissions
RUN mkdir -p /app/data /app/certs /app/storage/avatars \
    && chown -R node:node /app

# Copy built files from builder
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/storage/avatars/default-avatar.png ./storage/avatars/default-avatar.png
COPY --from=builder --chown=node:node /app/storage/avatars/deleted-user-avatar.png ./storage/avatars/deleted-user-avatar.png
# Copy source directory for TypeScript file access during migrations
COPY --from=builder --chown=node:node /app/src ./src

# Create a simple ESM-compatible shim for email.service
RUN echo 'export * from "./email.service.js";' > /app/dist/services/email.service



# Add scripts directory for permission management
COPY --chown=node:node ./backend/scripts /app/scripts
RUN chmod +x /app/scripts/*.sh 2>/dev/null || true

# Switch to non-root user
USER node

# Expose API port
EXPOSE ${PORT}

# Start application
CMD ["npm", "run", "start"]


#####################
#                   #
# Development stage #
#                   #
#####################
FROM node:20-slim AS dev

WORKDIR /app

# Install OpenSSL for certificate generation
RUN apt-get update && apt-get install -y --no-install-recommends openssl curl && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN chmod +x /app/scripts/*.sh 2>/dev/null || true

# Use node user for security
USER node

# Expose development port
EXPOSE ${PORT}

# Development command will be overridden in docker-compose
CMD ["npm", "run", "dev"]
