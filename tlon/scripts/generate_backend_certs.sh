#!/bin/sh
# Generate self-signed SSL certs for backend (valid 3 years)
# Usage: ./scripts/generate_backend_certs.sh

set -e

# Load environment variables from backend .env file if it exists
if [ -f "$(dirname "$0")/../backend/.env" ]; then
    # Export variables from .env file
    export $(grep -v '^#' "$(dirname "$0")/../backend/.env" | xargs)
fi

CERT_DIR="$(dirname "$0")/../backend/certs"
mkdir -p "$CERT_DIR"

openssl req -x509 -nodes -days 1095 -newkey rsa:2048 \
  -keyout "$CERT_DIR/backend.key" \
  -out "$CERT_DIR/backend.crt" \
  -subj "/C=${SSL_CERT_COUNTRY}/ST=${SSL_CERT_STATE}/L=${SSL_CERT_LOCALITY}/O=${SSL_CERT_ORGANIZATION}/OU=${SSL_CERT_ORGANIZATIONAL_UNIT}/CN=${SSL_CERT_COMMON_NAME}"

echo "Self-signed backend certificates generated at $CERT_DIR."
