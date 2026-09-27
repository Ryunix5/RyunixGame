# Ryunix Games

Real-time party games for friends in the same room (or call): create a lobby, share the code, pick a game.

Games: Split or Steal, The Last Word, Deceiving Cards, The Prisoners' Letter, Unknown to One, Mind Reader, Matching Minds.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000. The Vite dev server proxies the socket connection to the game server on port 3001. To play against yourself, open more tabs: each tab is its own player.

Production:

```bash
npm run build
node packages/server/dist/index.js
```

The server then serves the built client on port 3001 (`PORT` to change). See `.env.example` for the other settings.

Tests: `npm test --workspace=@ryunix/server` and `npm test --workspace=@ryunix/client`.

## Layout

| Package | What's in it |
|---|---|
| `packages/shared` | Types and socket event names used by both sides |
| `packages/server` | Express + Socket.IO server. Rooms, sessions, game engine, game rules |
| `packages/client` | React + Vite + Tailwind UI, one component per game |

Key server pieces:

- `RoomManager` is the in-memory source of truth for rooms and sessions. Rooms don't survive a server restart.
- `GameRunner` drives every game: it applies actions, runs scheduled actions, handles players leaving and decides when a game is over.
- `game/impl/*` holds one `GamePlugin` per game: just the rules, no networking.

## How players are identified

On connect the server issues a session token (kept in the tab's `sessionStorage`) mapped to a stable player id. Refreshing the tab or dropping the connection resumes the same player. A disconnected player keeps their seat for 60 seconds (`ROOM_CONFIG.RECONNECT_GRACE_MS`), shown as "offline", before they're removed.

Always identify the current player with `playerId` from `useSocket()`, never `socket.id`.

## Adding a game

1. **Server:** implement `GamePlugin` in `packages/server/src/game/impl/`, register it in `index.ts`.
   - `setup` / `handleAction` get a `GameContext`. Use `ctx.schedule(ms, action)` for timers. The action comes back through `handleAction` with `senderId === SYSTEM_SENDER`, and is dropped automatically if the game ends first.
   - Plugins are shared by all rooms: keep per-room data in the state, never on `this`.
   - Anything some players mustn't see (choices, roles, secret words) needs `getPlayerView`. Every player is sent the full state otherwise.
   - Implement `onPlayerLeave` so the game doesn't wait forever on someone who left.
   - Check `ctx.hostId` for host-only actions. The client hiding a button is not enforcement.
2. **Client:** add a component that renders `room.gameState`, and add it to the game list and the switch in `RoomView.tsx`.
3. **Tests:** see `packages/server/src/game/__tests__/GameRunner.test.ts` for driving a game through the runner.

## Content packs

Word and topic lists live in `packages/server/content/packages/*.json` and can be used by any game. See the README in that folder for the format.
