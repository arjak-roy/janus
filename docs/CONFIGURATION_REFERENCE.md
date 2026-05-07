# Configuration Reference

Reference for runtime configuration across Docker, backend, frontend, Janus, and remote app integration.

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

Variables below are split into two groups:
- values this repo actually reads at runtime
- reference values operators usually copy into external apps that integrate with this deployment

### Database

| Variable | Required | Default | Description |
|---|---|---|---|
| `POSTGRES_USER` | Yes | none | Postgres username |
| `POSTGRES_PASSWORD` | Yes | none | Postgres password |
| `POSTGRES_DB` | Yes | none | Postgres database name |
| `DATABASE_URL` | Yes | none | Prisma connection string used by backend |

### Backend Runtime

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `8080` | Backend listen port |
| `JANUS_HTTP_URL` | No | `http://172.28.0.1:8088/janus` | Janus HTTP API base used by backend service calls |
| `JANUS_API_SECRET` | Optional | empty | Added as `apisecret` on Janus HTTP API requests when Janus API auth is enabled |
| `API_SHARED_SECRET` | Recommended | empty | Checked against incoming `x-api-secret` on room create, destroy, and token routes |
| `JWT_SECRET` | Recommended | `dev-jwt-secret-change-in-production` | Secret used to sign participant join tokens |
| `JWT_EXPIRY` | No | `2h` | Participant token expiry |
| `CORS_ORIGINS` | Optional | empty | Additional comma-separated browser origins allowed by backend CORS |

### Janus Runtime

| Variable | Required | Default | Description |
|---|---|---|---|
| `JANUS_NAT_1_1_IP` | Optional | empty | Host or public IP used for Janus NAT mapping |

### Frontend Build and Runtime

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

### Remote Consumer Reference Variables

These values are typically set in external apps, not consumed by this repo itself.

| Variable | Used By | Description |
|---|---|---|
| `JANUS_API_URL` | External admin or candidate-facing backends | Base URL they should call for this repo's REST API |
| `JANUS_FRONTEND_URL` | External admin or candidate-facing backends | Public URL they should use when building join URLs to this repo's frontend |

## Backend Constants

Defined in `backend/src/config/constants.js`.

| Constant | Value | Meaning |
|---|---|---|
| `PORT` | `process.env.PORT || 8080` | Server listen port |
| `JANUS_HTTP` | `process.env.JANUS_HTTP_URL || 'http://172.28.0.1:8088/janus'` | Janus HTTP API base |
| `JANUS_API_SECRET` | `process.env.JANUS_API_SECRET || ''` | Janus request auth secret |
| `JWT_SECRET` | `process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production'` | Participant JWT signing secret |
| `JWT_EXPIRY` | `process.env.JWT_EXPIRY || '2h'` | Participant JWT expiry |
| `API_SHARED_SECRET` | `process.env.API_SHARED_SECRET || ''` | Shared secret for room and token routes |
| `ROOM_CLEANUP_INTERVAL_MS` | `30 * 60 * 1000` | Cleanup job cadence |
| `ROOM_MAX_IDLE_AGE_MS` | `60 * 60 * 1000` | Minimum empty room age before deletion |

Additional origin handling:
- localhost, loopback, and common private-LAN ranges are allowed by default
- `CORS_ORIGINS` appends extra exact origins as comma-separated values

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

Operational note:
- browser users usually reach the backend through the frontend proxy
- external app backends can call the backend port directly or call the public frontend origin and use `/api/*`

Origin handling:
- `map $http_origin $janus_allowed_origin` allows localhost and private LAN ranges.
- `proxy_set_header Origin $janus_allowed_origin` is sent to the Janus proxy target.

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
- this repo primarily creates TextRoom rooms dynamically as fallback or compatibility path

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
- Set `API_SHARED_SECRET` and `JWT_SECRET` for any deployment reachable beyond a local developer machine.
- Ensure Docker publishes media range `20000-20255` UDP and TCP.
- If cross-network traffic is expected, set `JANUS_NAT_1_1_IP` and TURN details.
- Confirm firewall rules for frontend, backend, Janus signaling, and RTP range.
- Validate `CORS_ORIGINS` and Nginx origin handling if exposing the app outside private networks.
- If external apps will integrate with this deployment, copy the correct public values into their `JANUS_API_URL` and `JANUS_FRONTEND_URL` settings.
