# Backend API

REST API reference for room, token, participant, and message operations.

This API is consumed by:
- the built-in Janus frontend dashboard and classroom UI
- external backends, such as `gts-academy-admin`, when this repo is deployed as a separate meeting service

Base URL options:
- through the built-in frontend proxy: same-origin `/api/*`
- direct backend port locally: `http://localhost:8080/api/*`
- dedicated deployment or VPS: `https://meet.example.com/api/*` or `http://<vps>:8080/api/*`

## Contents

1. [Conventions](#conventions)
2. [Health Endpoint](#health-endpoint)
3. [Rooms API](#rooms-api)
4. [Participant Token API](#participant-token-api)
5. [Participants API](#participants-api)
6. [Messages API](#messages-api)
7. [Status Codes](#status-codes)
8. [Rate Limits](#rate-limits)
9. [Error Behavior](#error-behavior)

## Conventions

### Room Identifier Inputs

Some endpoints accept either:
- Room UUID (`Room.id` from DB)
- Numeric Janus room id (`Room.janusId`)

Backend resolves room by trying UUID first and numeric `janusId` fallback.

### Auth Header

Routes that create, destroy, or mint participant tokens honor the `x-api-secret` header.

Behavior:
- if `API_SHARED_SECRET` is configured, the header must match it
- if `API_SHARED_SECRET` is empty, these routes are open for local development

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

Headers:

```http
x-api-secret: <API_SHARED_SECRET>
```

Body:

```json
{
  "name": "Math Class",
  "title": "Batch 4 Live Class",
  "isPrivate": false,
  "isLiveClass": true,
  "maxUsers": 6,
  "creatorId": "trainer-123",
  "creatorName": "Trainer Jane"
}
```

Behavior:
- backend generates `janusId` (random numeric)
- creates the room in both VideoRoom and TextRoom plugins
- on Janus success, writes the DB room row
- on Janus failure, returns 502 and does not persist room

Success response:

```json
{
  "success": true,
  "room": {
    "id": "fcbf3d31-7d0b-44d7-86f7-1a6346f2d4f3",
    "janusId": 34567,
    "name": "Math Class",
    "title": "Batch 4 Live Class",
    "isPrivate": false,
    "isLiveClass": true,
    "maxUsers": 6,
    "creatorId": "trainer-123",
    "creatorName": "Trainer Jane",
    "createdAt": "2026-05-05T11:20:00.000Z",
    "updatedAt": "2026-05-05T11:20:00.000Z"
  }
}
```

### `GET /api/rooms`

Returns all rooms ordered by newest first.

Success response shape:

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

Fetches one room by UUID or numeric Janus room id.

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

### `DELETE /api/rooms/:id`

Destroys the Janus room entries and deletes the DB row.

Headers:

```http
x-api-secret: <API_SHARED_SECRET>
```

Success:

```json
{
  "success": true,
  "destroyed": true
}
```

## Participant Token API

### `POST /api/rooms/:id/token`

Generates a signed participant JWT for the room.

Headers:

```http
x-api-secret: <API_SHARED_SECRET>
```

Body:

```json
{
  "userId": "candidate-2451",
  "displayName": "Alice",
  "role": "candidate"
}
```

Rules:
- `userId`, `displayName`, and `role` are required
- `role` must be `trainer` or `candidate`
- token contains `userId`, `displayName`, `role`, and `roomId`

Success:

```json
{
  "success": true,
  "token": "<jwt>",
  "room": {
    "id": "fcbf3d31-7d0b-44d7-86f7-1a6346f2d4f3",
    "janusId": 34567,
    "name": "Math Class",
    "title": "Batch 4 Live Class"
  }
}
```

This is the main route external apps use before redirecting users to this frontend at `/room/:roomId?token=...`.

## Participants API

### `GET /api/rooms/:id/participants`

Returns participants currently connected to the backend signaling WebSocket for the room.

Success:

```json
{
  "success": true,
  "participants": [
    {
      "userId": "candidate-2451",
      "displayName": "Alice",
      "role": "candidate",
      "joinedAt": "2026-05-07T10:15:00.000Z"
    }
  ]
}
```

Note: this is signaling presence tracked by the backend, not the raw Janus VideoRoom participant list.

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
| `GET /health` | 200 | backend and DB reachable |
| `GET /health` | 500 | DB check failed |
| `POST /api/rooms` | 200 | room created in Janus and DB |
| `POST /api/rooms` | 401 | invalid or missing `x-api-secret` when protection is enabled |
| `POST /api/rooms` | 502 | Janus room creation failed |
| `POST /api/rooms` | 500 | internal backend failure |
| `GET /api/rooms/:id` | 404 | room not found |
| `DELETE /api/rooms/:id` | 401 | invalid or missing `x-api-secret` when protection is enabled |
| `DELETE /api/rooms/:id` | 404 | room not found |
| `POST /api/rooms/:id/token` | 400 | missing or invalid `userId`, `displayName`, or `role` |
| `POST /api/rooms/:id/token` | 401 | invalid or missing `x-api-secret` when protection is enabled |
| `POST /api/rooms/:id/token` | 404 | room not found |
| `GET /api/rooms/:id/participants` | 404 | room not found |
| `POST /api/rooms/:roomId/messages` | 400 | missing sender or content |
| `POST /api/rooms/:roomId/messages` | 404 | room not found |
| `GET /api/rooms/:roomId/messages` | 404 | room not found |

## Rate Limits

| Route | Limit |
|---|---|
| `POST /api/rooms` | 10 requests per minute per client |
| `POST /api/rooms/:roomId/messages` | 60 requests per minute per client |

## Error Behavior

Known backend error patterns:

- Room creation Janus failure is internally tagged with `JANUS_CREATE_FAILED|...` and surfaced as a generic 502 payload.
- Message validation and room lookup are mapped to structured HTTP statuses in `MessageController`.
- `x-api-secret` checks are only enforced when `API_SHARED_SECRET` is configured.
- Participant JWTs are signed with `JWT_SECRET` and default to `JWT_EXPIRY=2h` unless overridden.
- Non-mapped failures return generic 500 error strings.

Related docs:
- [Janus Integration](./JANUS_INTEGRATION.md)
- [WebSocket Signaling](./WEBSOCKET_SIGNALING.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
