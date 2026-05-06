# Backend API

REST API reference for room and message operations.

Base URL (through frontend proxy):
- same-origin `/api/*`

Direct backend URL (if needed):
- `http://localhost:8080/api/*`

## Contents

1. [Conventions](#conventions)
2. [Health Endpoint](#health-endpoint)
3. [Rooms API](#rooms-api)
4. [Messages API](#messages-api)
5. [Status Codes](#status-codes)
6. [Rate Limits](#rate-limits)
7. [Error Behavior](#error-behavior)

## Conventions

### Room Identifier Inputs

Some endpoints accept either:
- Room UUID (`Room.id` from DB)
- Numeric Janus room id (`Room.janusId`)

Backend resolves room by trying UUID first and numeric `janusId` fallback.

### Response Envelope

Typical success:

```json
{
  "success": true,
  "...": "payload"
}
```

Typical failure:

```json
{
  "success": false,
  "error": "Error message"
}
```

## Health Endpoint

### `GET /health`

Checks backend and DB connectivity.

Success:

```json
{
  "status": "ok",
  "service": "janus-backend",
  "database": "connected"
}
```

Failure:

```json
{
  "status": "error",
  "service": "janus-backend",
  "database": "disconnected"
}
```

## Rooms API

### `POST /api/rooms`

Creates a room in Janus VideoRoom and TextRoom, then persists DB room metadata.

Body:

```json
{
  "name": "Math Class",
  "isPrivate": false,
  "maxUsers": 6
}
```

Behavior:
- backend generates `janusId` (random numeric)
- creates room in both plugins
- on Janus success, writes DB room row
- on Janus failure, returns 502 and does not persist room

Success response:

```json
{
  "success": true,
  "room": {
    "id": "fcbf3d31-7d0b-44d7-86f7-1a6346f2d4f3",
    "janusId": 34567,
    "name": "Math Class",
    "isPrivate": false,
    "maxUsers": 6,
    "createdAt": "2026-05-05T11:20:00.000Z",
    "updatedAt": "2026-05-05T11:20:00.000Z"
  }
}
```

### `GET /api/rooms`

Returns all rooms ordered by newest first.

Success response (shape):

```json
{
  "success": true,
  "rooms": [
    {
      "id": "...",
      "janusId": 34567,
      "name": "...",
      "_count": {
        "messages": 12
      }
    }
  ]
}
```

### `GET /api/rooms/:id`

Fetches one room by UUID or numeric Janus id.

Success:

```json
{
  "success": true,
  "room": {
    "id": "...",
    "janusId": 34567,
    "name": "..."
  }
}
```

If not found:

```json
{
  "success": false,
  "error": "Room not found"
}
```

## Messages API

### `POST /api/rooms/:roomId/messages`

Persists a chat message to Postgres.

Body:

```json
{
  "sender": "User-2451",
  "content": "Hello everyone"
}
```

Validation:
- `sender` required
- `content` required

Success response:

```json
{
  "success": true,
  "message": {
    "id": "...",
    "roomId": "...",
    "sender": "User-2451",
    "content": "Hello everyone",
    "createdAt": "2026-05-05T11:24:00.000Z"
  }
}
```

### `GET /api/rooms/:roomId/messages?limit=200`

Returns messages for a room.

Rules:
- default limit = 100
- max limit = 500
- ascending by `createdAt`

Success response:

```json
{
  "success": true,
  "messages": [
    {
      "id": "...",
      "sender": "User-2451",
      "content": "Hello",
      "createdAt": "2026-05-05T11:24:00.000Z"
    }
  ]
}
```

## Status Codes

| Endpoint | Status | Meaning |
|---|---|---|
| `GET /health` | 200 | backend + DB reachable |
| `GET /health` | 500 | DB check failed |
| `POST /api/rooms` | 200 | room created in Janus + DB |
| `POST /api/rooms` | 502 | Janus room creation failed |
| `POST /api/rooms` | 500 | internal backend failure |
| `GET /api/rooms/:id` | 404 | room not found |
| `POST /api/rooms/:roomId/messages` | 400 | missing sender/content |
| `POST /api/rooms/:roomId/messages` | 404 | room not found |
| `GET /api/rooms/:roomId/messages` | 404 | room not found |

## Rate Limits

| Route | Limit |
|---|---|
| `POST /api/rooms` | 10 requests per minute per client |
| `POST /api/rooms/:roomId/messages` | 60 requests per minute per client |

## Error Behavior

Known backend error patterns:

- Room creation Janus failure is internally tagged with `JANUS_CREATE_FAILED|...` and surfaced as generic 502 payload.
- Message validation and room lookup are mapped to structured HTTP statuses in `MessageController`.
- Non-mapped failures return generic 500 error strings.

Related docs:
- [Janus Integration](./JANUS_INTEGRATION.md)
- [WebSocket Signaling](./WEBSOCKET_SIGNALING.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
