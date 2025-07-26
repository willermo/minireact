# nginx HTTPS Setup for LAN

## Self-Signed Certificates

1. Generate a self-signed certificate (valid for 10 years):

```sh
mkdir -p nginx/certs
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout nginx/certs/privkey.pem \
  -out nginx/certs/fullchain.pem \
  -subj "/C=XX/ST=YourState/L=YourCity/O=YourOrg/CN=your.lan.ip.or.hostname"
```
- Replace `your.lan.ip.or.hostname` with your LAN IP or hostname.

2. Distribute `nginx/certs/fullchain.pem` to all client machines and import it as a trusted root CA/certificate (browser/OS-specific).

## nginx
- HTTPS will be available at: `https://<your-lan-ip>:8080`
- `/api` is proxied to backend, `/` serves frontend static files.
