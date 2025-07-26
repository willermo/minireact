#!/bin/sh
# Script to verify file permissions in development

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Check if the current user has the right permissions
echo "\n${YELLOW}Checking container user permissions...${NC}"
CONTAINER_UID=$(id -u)
CONTAINER_GID=$(id -g)
echo "Container running as UID:GID = ${CONTAINER_UID}:${CONTAINER_GID}"

# Check dist directory permissions
if [ -d "/app/dist" ]; then
  DIST_DIR_OWNER=$(stat -c "%u:%g" /app/dist)
  echo "Dist directory owned by: ${DIST_DIR_OWNER}"
  
  # Test write permissions
  touch /app/dist/.permission_test 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "${GREEN}✓ Dist directory is writable${NC}"
    rm /app/dist/.permission_test
  else
    echo "${RED}✗ Dist directory is not writable${NC}"
    echo "This may cause issues with build operations"
  fi
else
  echo "${YELLOW}Dist directory does not exist yet${NC}"
  mkdir -p /app/dist 2>/dev/null || echo "${RED}Failed to create dist directory${NC}"
fi

# Check certificates directory permissions
if [ -d "/app/certs" ]; then
  CERTS_DIR_OWNER=$(stat -c "%u:%g" /app/certs)
  echo "Certificates directory owned by: ${CERTS_DIR_OWNER}"
  
  # Test write permissions
  touch /app/certs/.permission_test 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "${GREEN}✓ Certificates directory is writable${NC}"
    rm /app/certs/.permission_test
  else
    echo "${RED}✗ Certificates directory is not writable${NC}"
    chown node:node /app/certs
    echo "Certificates directory ownership fixed"
  fi
else
  echo "${YELLOW}Certificates directory does not exist yet${NC}"
  mkdir -p /app/certs 2>/dev/null || echo "${RED}Failed to create certificates directory${NC}"
fi

# All checks passed
echo "${GREEN}Permission check completed${NC}\n"
