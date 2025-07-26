#!/bin/sh

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Check for Docker secrets - only do this in production mode
if [ -n "${NODE_ENV}" ] && [ "${NODE_ENV}" = "production" ]; then
  echo "${YELLOW}Checking for required SSL certificates...${NC}"
  
  if [ ! -f "/run/secrets/nginx_cert" ]; then
    echo "${RED}ERROR: SSL certificate not found at /run/secrets/nginx_cert!${NC}"
    echo "${RED}Cannot start nginx without certificates. Please ensure Docker secrets are properly configured.${NC}"
    echo "${YELLOW}Container will exit with error.${NC}"
    exit 1
  fi
  
  if [ ! -f "/run/secrets/nginx_key" ]; then
    echo "${RED}ERROR: SSL key not found at /run/secrets/nginx_key!${NC}"
    echo "${RED}Cannot start nginx without SSL key. Please ensure Docker secrets are properly configured.${NC}"
    echo "${YELLOW}Container will exit with error.${NC}"
    exit 1
  fi
  
  echo "${GREEN}SSL certificates verified ✓${NC}"
  
  # Create symbolic links from Docker secrets to nginx certificate paths
  mkdir -p /etc/nginx/certs
  ln -sf /run/secrets/nginx_cert /etc/nginx/certs/fullchain.pem
  ln -sf /run/secrets/nginx_key /etc/nginx/certs/privkey.pem
  echo "${GREEN}Linked certificates to nginx paths ✓${NC}"
fi

# Setup directory permissions properly
# Only needed in development mode or when running as non-root
if [ "$NODE_ENV" != "production" ] || [ "$(id -u)" != "0" ]; then
  echo "${YELLOW}Setting up directory permissions...${NC}"
  
  # Create required directories with appropriate permissions
  mkdir -p /app/dist
  
  # Get current user/group
  USER_ID=$(id -u)
  GROUP_ID=$(id -g)
  
  if [ -d "/app/node_modules" ]; then
    # Handle Vite cache directories
    mkdir -p /app/node_modules/.vite /app/node_modules/.vite-temp /app/node_modules/.vite/deps
    
    # Use appropriate permissions (755 is standard for directories)
    find /app/dist -type d -exec chmod 755 {} \; 2>/dev/null || true
    
    # Only make specific directories writable by the current user
    chown -R $USER_ID:$GROUP_ID /app/node_modules/.vite* 2>/dev/null || true
    
    echo "${GREEN}Directory permissions set successfully${NC}"
  fi
fi

# Pass command execution to the supplied command
echo "${GREEN}Starting frontend application...${NC}"
exec "$@"
