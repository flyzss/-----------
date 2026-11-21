# Repository Guidelines

## Project Structure & Module Organization

This repository contains **余烬防线 / EMBERLINE**, a static Canvas tank-defense game, plus its preserved original version.

- `index.htm` and `main.css` define the new interface and responsive layouts.
- `js/main.js` connects inputs, dialogs, HUD, and the animation loop.
- `js/game.js` implements the simulation: movement, collision, AI, waves, upgrades, and lifecycle.
- `js/renderer.js` draws procedural terrain, vehicles, effects, and radar; `js/sound.js` mixes Web Audio sound and music; `js/synthesis.js` generates cached PCM effects.
- `js/config.js` defines enemies, waves, upgrades, and SVG icons.
- `tests/*.test.mjs` exercise gameplay rules and sound synthesis without a browser.
- `legacy.htm`, `legacy.css`, `js/legacy-main.js`, the original entity modules, `image/`, and `audio/` serve the original game.
- `fonts/` contains the self-hosted display font and its license. `README.md`, `PRODUCT.md`, and `DESIGN.md` explain usage and design.

## Build, Test, and Development Commands

Run from the repository root:

```powershell
py -m http.server 8000 --bind 127.0.0.1
node --test tests/game.test.mjs tests/synthesis.test.mjs
git diff --check
```

The first command requires Python 3 and serves `http://127.0.0.1:8000/index.htm`; stop with Ctrl+C. HTTP is required for ES modules. The test command requires Node.js 22 or newer. No dependency installation, compilation, or configured linter is required.

## Coding Style & Naming Conventions

Use four-space indentation, camelCase for new variables and methods, and explicit `.js` extensions in ES module imports. Keep simulation logic independent of DOM and rendering. Use seconds for simulation timers and logical battlefield coordinates for collision and inputs.

All new or modified code must have complete Chinese comments explaining purpose, parameters, non-obvious logic, and gameplay rules. Preserve Chinese interface text and UTF-8 encoding. No formatter is configured; match nearby formatting. Treat `js/jquery.min.js` as vendored code. Preserve numeric legacy asset paths and the font license.

## Testing Guidelines

Use Node's built-in test runner; no coverage threshold is configured. Name files `*.test.mjs` and describe observable behavior in test names. Test collision, cooldowns, pause, progression, and lifecycle changes through the real simulation.

Browser-check changed flows: solo/co-op controls, touch input, audio activation/muting, pause/resume, upgrades, restart, and victory/defeat. Inspect console/network errors and desktop/mobile layouts. Record browser and scenarios tested; simulation tests do not establish sound quality or combat feel.

## Commit & Pull Request Guidelines

History contains many `1` messages and occasional Chinese feature descriptions; no consistent convention exists. Prefer descriptive messages such as `修复冲刺穿透掩体`. Keep commits focused. PRs should explain gameplay changes, link issues when available, list validation, and include screenshots or recordings for visual changes.
