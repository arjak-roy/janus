# Quick Start

Use this guide to run the GTS Meet stack locally with Docker Compose.

This stack supports two usage modes:
- Standalone meetings: open the built-in dashboard at `/` and create or join rooms directly.
- Separate meeting backend: run this repo on its own host or VPS, let external GTS apps call its backend API, and let users join on this repo's frontend.

## Contents

1. [Prerequisites](#prerequisites)
2. [Choose Your Usage Mode](#choose-your-usage-mode)
3. [Clone and Configure](#clone-and-configure)
4. [Start the Stack](#start-the-stack)
5. [Verify Services](#verify-services)
6. [Open the App](#open-the-app)
7. [Test From Phone on LAN](#test-from-phone-on-lan)
8. [Useful Commands](#useful-commands)
9. [Next Reading](#next-reading)

## Prerequisites

- Docker Desktop (or Docker Engine + Compose) installed
- Ports available on host:
  - 3000 (frontend HTTP)
  - 3001 (frontend HTTPS)
  - 8080 (backend API)
  - 8088 and 8188 (Janus HTTP and WebSocket)
  - 20000-20255 UDP/TCP (WebRTC media)
  - 5432 (Postgres)

## Choose Your Usage Mode

1. Standalone self-hosted meetings
   - Users browse directly to this repo's frontend.
   - The dashboard at `/` can still create rooms and join rooms by ID.

2. Separate VPS meeting service
   - External backends such as `gts-academy-admin` call this repo's backend API for room creation and token generation.
   - External apps send users to this repo's frontend URL for `/room/:roomId?token=...`.

## Clone and Configure

1. Copy environment template:

```bash
cp .env.example .env
```

2. Edit `.env` with real values.

Required in any environment:
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

Strongly recommended outside local-only development:
- `API_SHARED_SECRET` for `x-api-secret` protected room and token routes
- `JWT_SECRET` for participant token signing

Optional depending on deployment:
- `JANUS_API_SECRET` if Janus HTTP API auth is enabled
- `JANUS_HTTP_URL` if you are not using the default Docker host-bridge Janus address
- `JANUS_NAT_1_1_IP` for LAN/public NAT traversal
- `CORS_ORIGINS` for additional allowed browser origins

Reference-only values in `.env.example`:
- `JANUS_API_URL`
- `JANUS_FRONTEND_URL`

Those two are not consumed by this repo's Docker Compose stack. They are included so operators can copy the correct values into external apps that integrate with this deployment.

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
- Standalone flow: open `http://localhost:3000`, click `New Meeting`, or join an existing room by ID.
- Integrated flow: point external apps at `JANUS_API_URL=http://<HOST>:8080` and `JANUS_FRONTEND_URL=http://<HOST>:3000`.

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
