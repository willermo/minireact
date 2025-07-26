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

# Check data directory permissions
if [ -d "/app/data" ]; then
  DATA_DIR_OWNER=$(stat -c "%u:%g" /app/data)
  echo "Data directory owned by: ${DATA_DIR_OWNER}"
  
  # Test write permissions
  touch /app/data/.permission_test 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "${GREEN}✓ Data directory is writable${NC}"
    rm /app/data/.permission_test
  else
    echo "${RED}✗ Data directory is not writable${NC}"
    echo "This may cause issues with database operations"
  fi
else
  echo "${YELLOW}Data directory does not exist yet${NC}"
fi

# Check source code permissions
SRC_DIR_OWNER=$(stat -c "%u:%g" /app/src)
echo "Source code owned by: ${SRC_DIR_OWNER}"

# Check node_modules permissions if mounted
if [ -d "/app/node_modules" ]; then
  NODE_MODULES_OWNER=$(stat -c "%u:%g" /app/node_modules)
  echo "node_modules owned by: ${NODE_MODULES_OWNER}"
  
  # Check if node_modules is writable
  touch /app/node_modules/.permission_test 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "${GREEN}✓ node_modules is writable${NC}"
    rm /app/node_modules/.permission_test
  else
    echo "${RED}✗ node_modules is not writable${NC}"
    echo "This may cause issues when installing new dependencies"
  fi
fi

echo "${GREEN}Permission check complete${NC}\n"
