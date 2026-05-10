# Troubleshooting

Symptom-driven troubleshooting guide for backend, Janus, signaling, and UI behavior.

## Contents

1. [Quick Triage](#quick-triage)
2. [UI Not Reachable](#ui-not-reachable)
3. [Room Create Fails](#room-create-fails)
4. [No Remote Audio/Video](#no-remote-audiovideo)
5. [WebSocket Signaling Fails](#websocket-signaling-fails)
6. [Chat Issues](#chat-issues)
7. [Whiteboard Drift or Missing Updates](#whiteboard-drift-or-missing-updates)
8. [Cleanup Side Effects](#cleanup-side-effects)
9. [Useful Commands](#useful-commands)

## Quick Triage

Check these first:

1. Containers healthy:

```bash
docker-compose ps
```

2. Backend health:

```bash
curl http://localhost:8080/health
```

3. Frontend URL:

```text
http://localhost:3000
```

4. LAN URL (phone testing):

```text
http://<HOST_LAN_IP>:3000
```

## UI Not Reachable

Symptoms:
- browser cannot open app URL
- connection refused on port 3000

Checks:
- verify `frontend` container is up
- ensure host firewall allows inbound TCP 3000
- verify client and host are on same network for LAN tests

## Room Create Fails

Symptoms:
- `POST /api/rooms` returns 502
- UI shows room creation failure

Likely causes:
- Janus HTTP API unavailable from backend
- invalid/missing Janus API secret
- plugin attach/create operation failed

Checks:

```bash
docker-compose logs --tail=200 backend
docker-compose logs --tail=200 janus-gateway
```

Look for:
- `[Janus] Failed to create room in ...`
- plugin or session creation errors

## No Remote Audio/Video

Symptoms:
- participants join but no media stream
- remote tiles remain blank

Checks:
- ensure media ports `20000-20255` UDP/TCP are open
- verify Janus `rtp_port_range` matches compose-exposed range
- inspect browser WebRTC internals for selected ICE candidate and bytes flow
- verify camera/mic permissions in browser

Potential fixes:
- configure TURN servers for restrictive networks
- set `JANUS_NAT_1_1_IP` for NAT mapping scenarios

## WebSocket Signaling Fails

Symptoms:
- hand raise and whiteboard do not sync
- UI warns realtime signaling unavailable

Checks:
- inspect browser network tab for `/api/rooms/:roomId/ws`
- verify Nginx `/api/` location has upgrade headers
- check backend logs for socket close code `1008`:
	- invalid or missing token
	- room not found
	- token room mismatch
- ensure room URLs include `?token=<jwt>` and token has not expired
- confirm client receives `signaling-ready` before sending hand-raise/whiteboard events

Backend behavior notes:
- invalid payloads without `__signal` and `type` are dropped
- signaling is broadcast-only, not persisted

Fallback:
- frontend can fallback to TextRoom signaling if TextRoom is connected

## Chat Issues

Symptoms:
- message appears locally but not across clients
- messages not persisted

Path split to verify:
1. realtime path (TextRoom data channel)
2. persistence path (`POST /api/rooms/:roomId/messages`)
3. polling path (`GET /api/rooms/:roomId/messages` every 2s)

Checks:
- verify backend responses for message POST/GET
- confirm room identifier resolves correctly (UUID vs janusId)
- inspect errors in backend message controller logs

## Whiteboard Drift or Missing Updates

Symptoms:
- peers see different scenes
- late joiners start with empty board unexpectedly

Checks:
- ensure `wb-request-snapshot` and `wb-snapshot` events are flowing
- inspect signaling websocket connectivity
- verify large scene payloads are not blocked by proxy/network constraints

Behavior to remember:
- sync is event-based and not stored in DB
- periodic snapshots are designed to reduce drift

## Cleanup Side Effects

Symptoms:
- old room disappears from list
- historical messages removed unexpectedly

Current policy:
- every 30 min, backend checks participants
- empty room older than 1 hour is deleted
- room delete cascades messages in DB

If retention is needed, disable or modify cleanup behavior before production.

## Useful Commands

```bash
# Stack status
docker-compose ps

# Follow logs
docker-compose logs -f backend
docker-compose logs -f janus-gateway
docker-compose logs -f frontend

# Rebuild one service
docker-compose up -d --build backend

# Restart stack
docker-compose down
docker-compose up -d --build
```

Related docs:
- [Quick Start](./QUICK_START.md)
- [Deployment](./DEPLOYMENT.md)
- [WebSocket Signaling](./WEBSOCKET_SIGNALING.md)
- [Whiteboard Sync](./WHITEBOARD_SYNC.md)
