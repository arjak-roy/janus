# Media Streaming

How audio/video and screen share streams are published, routed, and rendered.

## Contents

1. [SFU Model](#sfu-model)
2. [Publisher and Subscriber Roles](#publisher-and-subscriber-roles)
3. [Codec and Room Defaults](#codec-and-room-defaults)
4. [Publish Flow](#publish-flow)
5. [Subscribe Flow](#subscribe-flow)
6. [Screen Share Flow](#screen-share-flow)
7. [ICE and Network Considerations](#ice-and-network-considerations)

## SFU Model

The platform uses Janus VideoRoom as SFU.

Implication:
- each participant sends upstream media to Janus
- Janus forwards selected streams to subscribers
- clients avoid mesh explosion in multi-user calls

```mermaid
flowchart LR
  A[Publisher A]
  B[Publisher B]
  C[Publisher C]
  J[Janus VideoRoom SFU]
  X[Subscriber X]
  Y[Subscriber Y]

  A -->|VP8/Opus| J
  B -->|VP8/Opus| J
  C -->|VP8/Opus| J

  J --> X
  J --> Y
```

## Publisher and Subscriber Roles

Publisher role:
- joins room with `ptype: publisher`
- publishes local tracks after join event

Subscriber role:
- separate handle per remote feed
- joins with `ptype: subscriber` and `feed` id
- creates answer on incoming JSEP and starts media

## Codec and Room Defaults

Room creation defaults from backend Janus request:
- `audiocodec: opus`
- `videocodec: vp8`
- `bitrate: 1500000`
- `bitrate_cap: false`
- `fir_freq: 10`
- `publishers: maxUsers || 6`
- `playoutdelay_ext: true`
- `transport_wide_cc_ext: true`

These are applied when backend creates VideoRoom via Janus API.

Publisher defaults from frontend Janus setup:
- camera capture targets `1280x720` at up to `30fps`
- VP8 simulcast is enabled for camera video
- simulcast layer ceilings are `high: 1200000`, `medium: 500000`, `low: 150000`

## Publish Flow

1. Frontend joins VideoRoom as publisher.
2. On `joined` event, frontend calls `publishOwnFeed()`.
3. Browser runs `getUserMedia` pre-check.
4. If video cannot be captured, fallback tries audio-only publish.
5. Frontend creates offer with audio/video tracks.
6. Frontend sends `configure` + JSEP to Janus.

## Subscribe Flow

1. On room join or `event` updates, frontend receives publisher list.
2. For each remote publisher, frontend attaches subscriber handle.
3. Subscriber joins using the `streams` API so Janus returns per-stream metadata, including subscriber mids.
4. Janus sends remote JSEP offer.
5. Frontend creates subscriber answer and sends `start`.
6. Frontend requests the highest simulcast substream by default and re-applies it after reconnects.
7. Remote tracks are added to a `MediaStream` and rendered in UI tiles.

## Simulcast And Adaptive Quality

Camera publishers use VP8 simulcast, and each subscriber independently requests the highest sustainable layer for that viewer's network conditions.

Current receive policy:
- start at the highest simulcast layer
- downshift quickly on subscriber `slowLink` events or sustained poor stats
- upshift only after several stable sampling intervals
- re-apply the requested layer after subscriber ICE restart or renegotiation

Current adaptation signals:
- inbound bitrate derived from WebRTC stats
- packet loss ratio
- round-trip time from the selected ICE candidate pair
- received frames per second

Current layer thresholds:
- degrade to `low` on severe congestion
- degrade to `medium` on moderate congestion
- return to `high` after sustained recovery

## Screen Share Flow

Screen share uses a dedicated second publisher handle:

1. attach another VideoRoom plugin handle
2. join as publisher with display suffix `(screen)`
3. create offer using `type: screen` capture
4. send `configure` with video enabled, audio disabled
5. stop/unpublish when user ends share or track ends

UI treatment:
- screen feeds are tracked separately from normal camera feeds
- classroom can switch to presentation-like layout when screen is active

## ICE and Network Considerations

Frontend ICE resolution order:
1. use `VITE_ICE_SERVERS_JSON` if provided
2. fallback STUN: `stun:stun.l.google.com:19302`
3. add TURN from `VITE_TURN_*` when configured

Janus network considerations:
- docker-compose exposes media range `20000-20255` UDP/TCP
- Janus config sets matching `rtp_port_range`
- `ice_tcp = true` improves fallback in restricted networks

Operational guidance:
- for LAN tests, ensure client reaches host on frontend port and media range is open
- for public deployments, configure NAT mapping and TURN as needed

Related docs:
- [Frontend Architecture](./FRONTEND_ARCHITECTURE.md)
- [Deployment](./DEPLOYMENT.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
