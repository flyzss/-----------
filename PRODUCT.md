# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users and Purpose

A locally playable Canvas tank-defense game, now expanded at the repository owner's request to support online cooperation, more mechanics and more levels. The owner delegates implementation and design while preserving the current visual identity and strong hit feedback.

## Stack

Static HTML/CSS and native JavaScript modules for the browser. Node.js 22+ and ws provide the online service. The same simulation runs offline and on the server. New code carries complete Chinese comments.

## Capabilities and Constraints

- Solo, same-screen two-player and two-client online co-op.
- Eighteen stages across three selectable zones, three bosses, eleven upgrades, temporary sentries, bombardment, overdrive and beacon capture.
- Server-authoritative rooms, readiness, shared pause, upgrade votes, per-tab recovery credentials and one-minute reconnect grace.
- LAN play through the same reachable server URL; public-network play requires a deployed reachable service. No external deployment is implied by local verification.
- Static Python serving remains available for offline modes. Original game remains at legacy.htm.

## Product Principles

- Start a match without account creation.
- Keep both clients in one authoritative battle.
- Preserve readable combat and explicit recovery paths.
- Do not confuse localhost verification with real-device, WAN latency or subjective feel validation.
