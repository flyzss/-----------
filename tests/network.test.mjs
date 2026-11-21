import test from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { createGameServer } from '../server/index.js';
import { WAVES } from '../js/config.js';

/** 使用真实 TCP/WebSocket 连接保存收到的协议消息，等待时既检查已有消息也监听新消息。 */
async function connect(port, options = {}) {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`, options),
        messages = [];
    socket.on('message', (raw) => messages.push(JSON.parse(raw.toString())));
    await new Promise((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('error', reject);
    });
    return {
        socket,
        messages,
        send: (value) => socket.send(JSON.stringify(value)),
        async wait(predicate, after = 0) {
            const started = Date.now();
            while (Date.now() - started < 3000) {
                const found = messages.slice(after).find(predicate);
                if (found) return found;
                await new Promise((resolve) => setTimeout(resolve, 12));
            }
            throw new Error('未收到预期协议消息');
        },
    };
}
/** 等待服务器收到关闭事件与下一帧，不把客户端发出消息当成服务器已经处理。 */
async function until(predicate) {
    const start = Date.now();
    while (!predicate()) {
        if (Date.now() - start > 3000) throw new Error('服务端状态等待超时');
        await new Promise((resolve) => setTimeout(resolve, 12));
    }
}

test('两个真实客户端完成建房、准备、权威移动、技能、暂停、重连和共同改装', async () => {
    const app = await createGameServer({ port: 0, host: '127.0.0.1' }),
        clients = [];
    try {
        const host = await connect(app.port);
        clients.push(host);
        host.send({ type: 'create', chapter: 0 });
        const first = await host.wait((m) => m.type === 'joined');
        assert.equal(first.slot, 1);
        assert.match(first.room.code, /^[A-Z2-9]{6}$/);
        const guest = await connect(app.port);
        clients.push(guest);
        guest.send({ type: 'join', code: first.room.code });
        const second = await guest.wait((m) => m.type === 'joined');
        assert.equal(second.slot, 2);
        assert.notEqual(second.token, first.token);
        const third = await connect(app.port);
        clients.push(third);
        third.send({ type: 'join', code: first.room.code });
        assert.match((await third.wait((m) => m.type === 'error')).message, /满/);
        host.send({ type: 'start' });
        assert.match((await host.wait((m) => m.type === 'error')).message, /准备/);
        host.send({ type: 'ready', ready: true });
        guest.send({ type: 'ready', ready: true });
        await host.wait(
            (m) => m.type === 'room' && m.room.players.length === 2 && m.room.players.every((p) => p.ready),
        );
        host.send({ type: 'start' });
        const start = await host.wait((m) => m.type === 'state' && m.snapshot.state === 'playing');
        const guestStart = await guest.wait((m) => m.type === 'state' && m.seq === start.seq);
        assert.deepEqual(start.snapshot.players, guestStart.snapshot.players);
        assert.ok(start.snapshot.walls.filter((w) => w.steel).every((w) => w.hp > 0));
        const room = app.manager.rooms.get(first.room.code),
            game = room.game;
        const x1 = game.players[0].x,
            x2 = game.players[1].x;
        // 恶意字段无法移动另一名玩家，也不能覆盖位置、装甲或积分。
        guest.send({ type: 'input', slot: 1, x: -1, y: 0, fire: true, aim: -1.5, hp: 99999, score: 99999 });
        await new Promise((resolve) => setTimeout(resolve, 180));
        assert.ok(game.players[1].x < x2 - 15);
        assert.equal(game.players[0].x, x1);
        assert.equal(game.players[1].maxHp, 100);
        assert.equal(game.score, 0);
        guest.send({ type: 'support' });
        await until(() => game.turrets.length === 1);
        assert.ok(game.players[1].supportCd > 0);
        assert.equal(game.players[0].supportCd, 0);
        host.send({ type: 'pause' });
        await until(() => game.state === 'paused');
        const frozen = game.time;
        await new Promise((resolve) => setTimeout(resolve, 80));
        assert.equal(game.time, frozen);
        host.send({ type: 'resume' });
        await until(() => game.state === 'playing');
        guest.socket.terminate();
        await until(() => room.peers[1].socket === null);
        assert.equal(game.state, 'paused');
        const pausedPosition = game.players[1].x,
            pausedTime = game.time;
        await new Promise((resolve) => setTimeout(resolve, 80));
        assert.equal(game.time, pausedTime);
        const resumed = await connect(app.port);
        clients.push(resumed);
        resumed.send({ type: 'resumeRoom', code: first.room.code, token: second.token });
        assert.equal((await resumed.wait((m) => m.type === 'joined')).slot, 2);
        await until(() => game.state === 'playing');
        assert.equal(game.players[1].x, pausedPosition);
        const invalid = await connect(app.port);
        clients.push(invalid);
        invalid.send({ type: 'resumeRoom', code: first.room.code, token: 'invalid' });
        assert.match((await invalid.wait((m) => m.type === 'error')).message, /凭据/);
        game.enemies = [];
        game.spawned = WAVES[0].count;
        game.waveDelay = 3;
        game.hitstop = 0;
        await until(() => game.state === 'upgrade');
        const chosen = game.choices[0].id;
        host.send({ type: 'vote', id: chosen });
        await until(() => room.votes[1] === chosen);
        assert.equal(game.state, 'upgrade');
        resumed.send({ type: 'vote', id: game.choices[1].id });
        await until(() => game.wave === 2);
        assert.equal(game.upgrades.at(-1), chosen);
        assert.equal(game.players[0].damage, game.players[1].damage);
        host.send({ type: 'leave' });
        await resumed.wait((m) => m.type === 'closed');
        assert.equal(app.manager.rooms.size, 0);
    } finally {
        for (const client of clients) client.socket.terminate();
        await app.close();
    }
});

test('同一席位刷新替换旧连接，不触发幽灵断线；超出恢复窗口会关闭房间', async () => {
    const app = await createGameServer({ port: 0, host: '127.0.0.1', disconnectGrace: 60 }),
        clients = [];
    try {
        const first = await connect(app.port);
        clients.push(first);
        first.send({ type: 'create', chapter: 2 });
        const joined = await first.wait((m) => m.type === 'joined');
        const replacement = await connect(app.port);
        clients.push(replacement);
        replacement.send({ type: 'resumeRoom', code: joined.room.code, token: joined.token });
        const restored = await replacement.wait((m) => m.type === 'joined');
        assert.equal(restored.room.chapter, 2);
        await until(() => first.socket.readyState === WebSocket.CLOSED);
        const room = app.manager.rooms.get(joined.room.code);
        assert.ok(room.peers[0].socket);
        replacement.socket.terminate();
        await until(() => !app.manager.rooms.has(joined.room.code));
    } finally {
        for (const client of clients) client.socket.terminate();
        await app.close();
    }
});

test('HTTP 只公开游戏资源，跨站 WebSocket 握手拒绝访问', async () => {
    const app = await createGameServer({ port: 0, host: '127.0.0.1' });
    try {
        const base = `http://127.0.0.1:${app.port}`;
        const health = await fetch(`${base}/api/health`).then((r) => r.json());
        assert.equal(health.online, true);
        assert.ok(health.joinBase.startsWith('http'));
        assert.equal((await fetch(`${base}/index.htm`)).status, 200);
        assert.equal((await fetch(`${base}/js/network.js`)).status, 200);
        for (const route of [
            '/server/index.js',
            '/.git/config',
            '/package.json',
            '/tests/game.test.mjs',
            '/js/%2e%2e/server/index.js',
        ])
            assert.equal((await fetch(base + route)).status, 404, route);
        const status = await new Promise((resolve) => {
            const socket = new WebSocket(`ws://127.0.0.1:${app.port}/ws`, {
                origin: 'https://unrelated.example',
            });
            socket.on('unexpected-response', (_, response) => {
                resolve(response.statusCode);
                response.resume();
                socket.terminate();
            });
            socket.on('error', () => {});
        });
        assert.equal(status, 403);
    } finally {
        await app.close();
    }
});
