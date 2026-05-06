# Configuration Reference

Reference for runtime configuration across Docker, backend, frontend, and Janus.

## Contents

1. [Environment Variables](#environment-variables)
2. [Backend Constants](#backend-constants)
3. [Rate Limits](#rate-limits)
4. [Nginx Proxy Configuration](#nginx-proxy-configuration)
5. [Janus Configuration Files](#janus-configuration-files)
6. [Room Cleanup Policy](#room-cleanup-policy)
7. [Configuration Checklist](#configuration-checklist)

## Environment Variables

Source template: `.env.example`.

### Database

| Variable | Required | Default | Description |
|---|---|---|---|
| `POSTGRES_USER` | Yes | none | Postgres username |
| `POSTGRES_PASSWORD` | Yes | none | Postgres password |
| `POSTGRES_DB` | Yes | none | Postgres database name |
| `DATABASE_URL` | Yes | none | Prisma connection string used by backend |

### Backend

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `8080` | Backend listen port |
| `JANUS_API_SECRET` | Recommended | empty | Appended as `apisecret` for Janus admin API requests |
| `JANUS_ADMIN_SECRET` | Optional | empty | Reserved, currently not used in service calls |

### Janus Runtime

| Variable | Required | Default | Description |
|---|---|---|---|
| `JANUS_NAT_1_1_IP` | Optional | empty | Host/LAN IP for NAT mapping in Janus deployments |

### Frontend Build/Runtime

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_BACKEND_URL` | Optional | empty | Explicit API base URL. Empty uses same-origin `/api` |
| `VITE_JANUS_WS_URL` | Optional | empty | Explicit Janus WS URL. Empty uses same-origin `/janus-ws` |
| `VITE_PROXY_BACKEND_TARGET` | Dev only | `http://localhost:8080` | Vite dev proxy target for `/api` |
| `VITE_PROXY_JANUS_WS_TARGET` | Dev only | `ws://localhost:8188` | Vite dev proxy target for `/janus-ws` |
| `VITE_ICE_SERVERS_JSON` | Optional | empty | JSON ICE server array override |
| `VITE_TURN_URL` | Optional | empty | TURN server URL fallback |
| `VITE_TURN_USERNAME` | Optional | empty | TURN username |
| `VITE_TURN_CREDENTIAL` | Optional | empty | TURN credential |

## Backend Constants

Defined in `backend/src/config/constants.js`.

| Constant | Value | Meaning |
|---|---|---|
| `PORT` | `process.env.PORT || 8080` | Server listen port |
| `JANUS_HTTP` | `process.env.JANUS_HTTP_URL || http://janus-gateway:8088/janus` | Janus HTTP API base |
| `JANUS_API_SECRET` | `process.env.JANUS_API_SECRET || ''` | Janus request auth secret |
| `ROOM_CLEANUP_INTERVAL_MS` | `30 * 60 * 1000` | Cleanup job cadence |
| `ROOM_MAX_IDLE_AGE_MS` | `60 * 60 * 1000` | Minimum empty room age before deletion |

## Rate Limits

Defined in `backend/src/middleware/rateLimiters.js`.

| Limiter | Window | Max | Applies To |
|---|---|---|---|
| `roomCreateLimiter` | 60 seconds | 10 | `POST /api/rooms` |
| `messageLimiter` | 60 seconds | 60 | `POST /api/rooms/:roomId/messages` |

## Nginx Proxy Configuration

Key paths in `frontend/nginx.conf`:

- `/api/` -> `http://backend:8080/api/`
- `/health` -> `http://backend:8080/health`
- `/janus-ws` -> `http://janus-gateway:8188`

WebSocket upgrade headers are configured for both `/api/` and `/janus-ws`.

Origin handling:
- `map $http_origin $janus_allowed_origin` allows localhost and private LAN ranges.
- `proxy_set_header Origin $janus_allowed_origin` is sent to Janus proxy target.

## Janus Configuration Files

### `conf/janus.jcfg`

Main concerns:
- plugin and transport folder locations
- debug level and logging controls
- NAT and media port range (`rtp_port_range = "20000-20255"`)
- ICE-TCP enabled (`ice_tcp = true`)

### `conf/janus.transport.websockets.jcfg`

Main concerns:
- WebSocket signaling enabled (`ws = true`)
- WS port (`ws_port = 8188`)
- optional admin websocket settings (currently disabled)
- CORS allow list for localhost addresses

### `conf/janus.plugin.videoroom.jcfg`

Main concerns:
- plugin-level defaults
- optional static room declarations
- this repo primarily creates rooms dynamically from backend service

### `conf/janus.plugin.textroom.jcfg`

Main concerns:
- optional static chat room declarations
- this repo primarily creates TextRoom rooms dynamically as fallback/compatibility path

## Room Cleanup Policy

Room cleanup is implemented in `CleanupService` and triggered by a scheduled job.

Policy:
1. Every 30 minutes, backend loads all rooms.
2. For each room, backend requests `listparticipants` from Janus VideoRoom.
3. If room has zero participants and age exceeds 1 hour:
- destroy VideoRoom and TextRoom entries in Janus
- delete room from Postgres (messages cascade delete via relation)

## Configuration Checklist

Before running in LAN or production-like setups:

- Verify `.env` is populated and not using placeholders.
- Ensure Docker publishes media range `20000-20255` UDP and TCP.
- If cross-network traffic is expected, set `JANUS_NAT_1_1_IP` and TURN details.
- Confirm firewall rules for frontend, backend, Janus signaling, and RTP range.
- Validate CORS and origin rules if exposing app outside private networks.
