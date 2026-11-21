import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import WebSocket from 'ws';
import { resolveAppBase, appUrl, websocketUrl, roomStorageKey } from '../js/paths.js';
import { createGameServer } from '../server/index.js';
import { Game } from '../js/game.js';
import { OnlineSession } from '../js/network.js';

/** 校验浏览器模块路径、页面路径及 Node 测试入口都能得到正确的应用目录。 */
test('应用目录从模块位置推导，兼容根目录、tank 目录和查询参数', () => {
    assert.equal(resolveAppBase('https://example.com/js/paths.js', 'https://example.com/').pathname, '/');
    assert.equal(
        resolveAppBase('https://example.com/tank/js/paths.js', 'https://example.com/tank/?room=ABC234')
            .pathname,
        '/tank/',
    );
    assert.equal(
        resolveAppBase(
            'https://example.com/games/tank/js/paths.js',
            'https://example.com/games/tank/index.htm',
        ).pathname,
        '/games/tank/',
    );
    assert.equal(
        resolveAppBase('file:///project/js/paths.js', 'http://localhost:8080/tank/index.htm').pathname,
        '/tank/',
    );
});

/** 当前路径参与接口、WSS、分享链接和凭据分区，不只修复首页的静态资源。 */
test('HTTPS 子目录的接口、邀请与恢复凭据保留 tank 前缀', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'location');
    try {
        Object.defineProperty(globalThis, 'location', {
            configurable: true,
            writable: true,
            value: new URL('https://games.frp.q-auto-parts.com/tank/?room=ABC234'),
        });
        assert.equal(appUrl('api/health').href, 'https://games.frp.q-auto-parts.com/tank/api/health');
        assert.equal(websocketUrl(), 'wss://games.frp.q-auto-parts.com/tank/ws');
        assert.equal(
            appUrl('index.htm', 'http://192.168.1.2:8080').href,
            'https://192.168.1.2:8080/tank/index.htm',
        );
        assert.equal(roomStorageKey(), 'emberline-room:/tank/');
        globalThis.location = new URL('http://localhost:8080/index.htm');
        assert.equal(websocketUrl(), 'ws://localhost:8080/ws');
        assert.notEqual(roomStorageKey(), 'emberline-room:/tank/');
    } finally {
        if (original) Object.defineProperty(globalThis, 'location', original);
        else delete globalThis.location;
    }
});

/** 等待真实客户端和服务端的状态变化，避免用固定延时伪造连接成功。 */
async function until(predicate) {
    const started = Date.now();
    while (!predicate()) {
        if (Date.now() - started > 3000) throw new Error('子目录联机等待超时');
        await new Promise((resolve) => setTimeout(resolve, 15));
    }
}

test('去掉 tank 前缀后，真实 HTTP、WebSocket、准备与 P2 恢复仍共用同一房间', async () => {
    const app = await createGameServer({ port: 0, host: '127.0.0.1' });
    // 测试前置路由模拟 NGINX 的去前缀结果，复用正式 HTTP 和 WebSocket 处理器。
    const proxy = http.createServer((request, response) => {
        if (!request.url.startsWith('/tank/')) {
            response.writeHead(404);
            response.end();
            return;
        }
        request.url = request.url.slice('/tank'.length);
        app.server.emit('request', request, response);
    });
    proxy.on('upgrade', (request, socket, head) => {
        if (request.url !== '/tank/ws') {
            socket.destroy();
            return;
        }
        request.url = '/ws';
        app.server.emit('upgrade', request, socket, head);
    });
    await new Promise((resolve) => proxy.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${proxy.address().port}/tank/`;
    const originals = new Map(
        ['location', 'WebSocket', 'sessionStorage'].map((key) => [
            key,
            Object.getOwnPropertyDescriptor(globalThis, key),
        ]),
    );
    const storage = new Map(),
        requests = [];
    class BrowserSocket extends WebSocket {
        constructor(url) {
            requests.push(String(url));
            super(url, { origin: new URL(base).origin });
        }
    }
    Object.defineProperty(globalThis, 'location', { configurable: true, value: new URL(base) });
    Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: BrowserSocket });
    Object.defineProperty(globalThis, 'sessionStorage', {
        configurable: true,
        value: {
            getItem: (key) => storage.get(key) || null,
            setItem: (key, value) => storage.set(key, value),
            removeItem: (key) => storage.delete(key),
        },
    });
    const sound = { play() {}, update() {} };
    const host = new OnlineSession(new Game(sound, () => {}), sound, () => {});
    const guest = new OnlineSession(new Game(sound, () => {}), sound, () => {});
    const restored = new OnlineSession(new Game(sound, () => {}), sound, () => {});
    try {
        assert.equal((await fetch(appUrl('api/health')).then((r) => r.json())).online, true);
        for (const route of [
            '',
            'index.htm',
            'main.css',
            'js/main.js',
            'js/paths.js',
            'fonts/ChakraPetch-Bold.ttf',
        ]) {
            assert.equal((await fetch(new URL(route, base))).status, 200, route);
        }
        const room = await host.open({ type: 'create', chapter: 0 });
        await guest.open({ type: 'join', code: room.code });
        const saved = guest.saved();
        host.send({ type: 'ready', ready: true });
        guest.send({ type: 'ready', ready: true });
        await until(() => host.room.players.length === 2 && host.room.players.every((p) => p.ready));
        host.send({ type: 'start' });
        await until(() => guest.game.state === 'playing');
        assert.equal(guest.slot, 2);
        const invite = appUrl('index.htm');
        invite.searchParams.set('room', room.code);
        assert.equal(invite.pathname, '/tank/index.htm');
        await restored.open({ type: 'resumeRoom', ...saved });
        await until(() => restored.game.state === 'playing');
        assert.equal(restored.slot, 2);
        await until(() => !guest.active);
        assert.equal(guest.credentials, null);
        assert.ok(requests.every((url) => url.endsWith('/tank/ws')));
    } finally {
        host.cleanup();
        guest.cleanup();
        restored.cleanup();
        await app.close();
        await new Promise((resolve) => proxy.close(resolve));
        for (const [key, descriptor] of originals) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else delete globalThis[key];
        }
    }
});
