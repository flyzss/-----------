import test from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { createGameServer } from '../server/index.js';
import { Game } from '../js/game.js';
import { OnlineSession } from '../js/network.js';

/** 等待真实异步协议状态，不用固定延时假设服务器已经完成处理。 */
async function until(predicate) {
    const started = Date.now();
    while (!predicate()) {
        if (Date.now() - started > 3500) throw new Error('客户端状态等待超时');
        await new Promise((resolve) => setTimeout(resolve, 15));
    }
}

test('正式联机客户端可以上传操作、映射 P2 技能并在断线后自动恢复原席位', async () => {
    const app = await createGameServer({ port: 0, host: '127.0.0.1' });
    const originals = new Map(
        ['WebSocket', 'location', 'sessionStorage'].map((key) => [
            key,
            Object.getOwnPropertyDescriptor(globalThis, key),
        ]),
    );
    const storage = new Map(),
        events = [];
    // Node 提供真实 WebSocket 传输；仅替代浏览器环境对象，不复制客户端或服务器协议实现。
    Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: WebSocket });
    Object.defineProperty(globalThis, 'location', {
        configurable: true,
        value: new URL(`http://127.0.0.1:${app.port}/index.htm`),
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
        configurable: true,
        value: {
            getItem: (key) => storage.get(key) || null,
            setItem: (key, value) => storage.set(key, value),
            removeItem: (key) => storage.delete(key),
        },
    });
    const sound = { play() {}, update() {} };
    const hostGame = new Game(sound, () => {}),
        guestGame = new Game(sound, () => {});
    const host = new OnlineSession(hostGame, sound, () => {}),
        guest = new OnlineSession(guestGame, sound, (type, data) => events.push({ type, data }));
    try {
        const room = await host.open({ type: 'create', chapter: 1 });
        await guest.open({ type: 'join', code: room.code });
        host.send({ type: 'ready', ready: true });
        guest.send({ type: 'ready', ready: true });
        await until(() => host.room.players.length === 2 && host.room.players.every((p) => p.ready));
        host.send({ type: 'start' });
        await until(() => guestGame.state === 'playing' && guestGame.wave === 7);
        assert.equal(guest.slot, 2);
        assert.equal(guestGame.zone, 1);
        assert.equal(typeof guestGame.commandSender, 'function');
        const authoritative = app.manager.rooms.get(room.code).game;
        const x = authoritative.players[1].x;
        guestGame.keys.add('KeyD');
        guest.update(0.05);
        await until(() => authoritative.players[1].x > x + 10);
        guestGame.keys.clear();
        guest.update(0.05);
        guestGame.deployTurret(1);
        await until(() => authoritative.players[1].supportCd > 0);
        assert.equal(authoritative.players[0].supportCd, 0);
        const oldSocket = guest.socket,
            token = guest.credentials.token;
        app.manager.rooms.get(room.code).peers[1].socket.terminate();
        await until(() => events.some((event) => event.type === 'connection'));
        await until(
            () =>
                guest.socket !== oldSocket &&
                guest.active &&
                guest.socket.readyState === WebSocket.OPEN &&
                guestGame.state === 'playing',
        );
        assert.equal(guest.slot, 2);
        assert.equal(guest.credentials.token, token);
        assert.equal(app.manager.rooms.get(room.code).peers.length, 2);
        assert.ok(guestGame.players[1].supportCd > 0);
        assert.ok(events.some((event) => event.type === 'sync'));
    } finally {
        host.cleanup();
        guest.cleanup();
        await app.close();
        for (const [key, descriptor] of originals) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else delete globalThis[key];
        }
    }
});
