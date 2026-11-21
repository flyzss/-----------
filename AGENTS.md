# Repository Guidelines

## Project Structure & Module Organization

**余烬防线 / EMBERLINE** supports offline solo/local co-op and server-authoritative online co-op across a 24-stage campaign.

- `index.htm` / `main.css` contain the responsive interface.
- `js/main.js` connects inputs, dialogs, HUD, and the animation loop.
- `js/game.js` is the shared simulation; keep it independent of browser APIs so Node and offline play use identical rules.
- `js/config.js` defines zones, waves, enemies, events, and upgrades.
- `js/renderer.js`, `js/sound.js`, and `js/synthesis.js` handle procedural graphics and audio.
- `js/network.js` manages browser connections and interpolation; `js/protocol.js` validates input and generates snapshots.
- `server/index.js` serves permitted assets and WebSocket connections; `server/rooms.js` owns rooms and battle state.
- `tests/*.test.mjs` cover gameplay, synthesis, and real WebSocket integration.
- `legacy.htm`, `legacy.css`, original entity modules, `image/`, and `audio/` retain the old game. `fonts/` contains the display font and license.

## Build, Test, and Development Commands

Run from the repository root with Node.js 22+:

```powershell
npm install
npm start
npm test
git diff --check
```

`npm start` serves the game and rooms at `http://localhost:8080/index.htm`; `HOST` and `PORT` override the listener. Share the printed LAN address with another device. `npm test` uses Node's built-in runner, including two-client integration tests. No compilation or configured linter is required.

For offline modes only, `py -m http.server 8000 --bind 127.0.0.1` serves the static game; Python does not provide rooms. ES modules require HTTP.

## Coding Style & Naming Conventions

Use four-space indentation, camelCase, and explicit `.js` ES module imports. Measure simulation timers in seconds and collisions in logical battlefield coordinates. All new or modified code must include complete Chinese comments explaining purpose, parameters, non-obvious logic, and gameplay rules. Preserve Chinese text, UTF-8, legacy numeric asset paths, and font licensing. Match nearby formatting; no formatter is configured.

## Testing Guidelines

Name tests `*.test.mjs` and describe observable behavior. Test authoritative rules, bounded inputs, reconnect lifecycle, and synchronized upgrades through actual production code. No coverage threshold is configured.

Browser-check solo/co-op, separate online clients, reload recovery, touch, audio, pause, upgrades, and viewport overflow. Do not infer public-network or device behavior from localhost tests. Keep tokens private to their player; never serve server files, repository metadata, or tests as game assets.

## Commit & Pull Request Guidelines

History has no consistent convention. Prefer descriptive messages such as `新增联机房间与断线恢复`, with focused commits. PRs should explain gameplay changes, link relevant issues, list validation and network limits, and include screenshots or recordings for visible changes.
