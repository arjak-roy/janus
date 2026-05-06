# Quick Start

Use this guide to run the Janus classroom stack locally with Docker Compose.

## Contents

1. [Prerequisites](#prerequisites)
2. [Clone and Configure](#clone-and-configure)
3. [Start the Stack](#start-the-stack)
4. [Verify Services](#verify-services)
5. [Open the App](#open-the-app)
6. [Test From Phone on LAN](#test-from-phone-on-lan)
7. [Useful Commands](#useful-commands)
8. [Next Reading](#next-reading)

## Prerequisites

- Docker Desktop (or Docker Engine + Compose) installed
- Ports available on host:
  - 3000 (frontend HTTP)
  - 3001 (frontend HTTPS)
  - 8080 (backend API)
  - 8088 and 8188 (Janus HTTP and WebSocket)
  - 20000-20255 UDP/TCP (WebRTC media)
  - 5432 (Postgres)

## Clone and Configure

1. Copy environment template:

```bash
cp .env.example .env
```

2. Edit `.env` with real values.

Minimum required values:
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `JANUS_API_SECRET`

Optional but useful for LAN/media stability:
- `JANUS_NAT_1_1_IP` (host LAN IP)

## Start the Stack

```bash
docker-compose up -d --build
```

This starts:
- `janus-gateway`
- `janus-db`
- `janus-backend`
- `janus-frontend`

## Verify Services

1. Check containers:

```bash
docker-compose ps
```

2. Check backend health:

```bash
curl http://localhost:8080/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "janus-backend",
  "database": "connected"
}
```

3. Optional logs:

```bash
docker-compose logs -f janus-gateway
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Open the App

- Frontend UI: `http://localhost:3000`
- Backend API: `http://localhost:8080`

## Test From Phone on LAN

1. Find your PC LAN IP (for example `192.168.1.42`).
2. Open from phone browser:

```text
http://<YOUR_PC_LAN_IP>:3000
```

3. Ensure:
- phone and host are on same Wi-Fi/network
- firewall allows inbound TCP 3000
- media ports are not blocked in local firewall/security tools

## Useful Commands

Stop services:

```bash
docker-compose down
```

Rebuild a single service:

```bash
docker-compose up -d --build backend
docker-compose up -d --build frontend
```

Reset full stack including volumes:

```bash
docker-compose down -v
```

## Next Reading

- [Architecture](./ARCHITECTURE.md)
- [Deployment](./DEPLOYMENT.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
