# Build stage for generating self-signed certs if needed
FROM alpine:3.18 AS certs

# Install openssl
RUN apk add --no-cache openssl

# Create certs directory
RUN mkdir -p /certs

# Load environment variables from .env file
ENV CERT_C=${CERT_C} \
    CERT_ST=${CERT_ST} \
    CERT_L=${CERT_L} \
    CERT_O=${CERT_O} \
    CERT_CN=${CERT_CN}

# Generate self-signed certificate
RUN openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout /certs/privkey.pem \
  -out /certs/fullchain.pem \
  -subj "/C=${CERT_C}/ST=${CERT_ST}/L=${CERT_L}/O=${CERT_O}/CN=${CERT_CN}" \
  && chmod 600 /certs/privkey.pem \
  && chmod 644 /certs/fullchain.pem

# Final Nginx image
FROM nginx:latest

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy certificates from certs stage
COPY --from=certs /certs /etc/nginx/certs

# Set proper permissions for nginx user
RUN chmod 700 /etc/nginx/certs \
    && chmod 600 /etc/nginx/certs/privkey.pem \
    && chmod 644 /etc/nginx/certs/fullchain.pem

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
