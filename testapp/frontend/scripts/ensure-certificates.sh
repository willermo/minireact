#!/bin/bash
set -e

# Load environment variables from frontend .env file if it exists
if [ -f "/app/.env" ]; then
    # Export only SSL certificate variables from .env file
    export $(grep '^SSL_CERT_' "/app/.env" | xargs)
fi

CERT_DIR="/app/certs"
KEY_FILE="$CERT_DIR/frontend.key"
CERT_FILE="$CERT_DIR/frontend.crt"
DAYS_VALID=365

# Ensure certificate directory exists
mkdir -p $CERT_DIR

# Function to check if certificate is valid
check_cert_validity() {
  # If cert doesn't exist, it's not valid
  if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    echo "Certificate or key file missing"
    return 1
  fi

  # Check if openssl can read the certificate
  if ! openssl x509 -in "$CERT_FILE" -noout 2>/dev/null; then
    echo "Certificate is not valid"
    return 1
  fi
  
  # Check expiration (must have at least 30 days left)
  EXPIRY=$(openssl x509 -in "$CERT_FILE" -enddate -noout | cut -d'=' -f2)
  EXPIRY_SECONDS=$(date -d "$EXPIRY" +%s)
  CURRENT_SECONDS=$(date +%s)
  THIRTY_DAYS_SECONDS=$((30 * 24 * 60 * 60))
  
  if [ $(($EXPIRY_SECONDS - $CURRENT_SECONDS)) -lt $THIRTY_DAYS_SECONDS ]; then
    echo "Certificate will expire soon (less than 30 days)"
    return 1
  fi
  
  return 0
}

# Generate self-signed certificate if needed
if ! check_cert_validity; then
  echo "Generating new self-signed certificate..."
  openssl req -x509 -nodes -days $DAYS_VALID -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/C=${SSL_CERT_COUNTRY}/ST=${SSL_CERT_STATE}/L=${SSL_CERT_CITY}/O=${SSL_CERT_ORGANIZATION}/CN=${SSL_CERT_COMMON_NAME}"

  echo "Certificate generated successfully"
fi

# Ensure correct permissions
chmod 600 "$KEY_FILE"
chmod 644 "$CERT_FILE"

# If running as root, fix ownership to match container user
if [ "$(id -u)" = "0" ]; then
  chown node:node "$KEY_FILE" "$CERT_FILE"
fi

echo "Certificates are valid and ready to use"
