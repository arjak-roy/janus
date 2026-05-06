#!/bin/bash
# Generate self-signed certs for local Docker development.
# Run from the certs/ directory: bash generate-self-signed.sh
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout cert.key \
  -out cert.crt \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
echo "Generated cert.crt and cert.key"
