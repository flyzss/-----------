import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { performance } from 'node:perf_hooks';
import { WebSocketServer } from 'ws';
import { RoomManager } from './rooms.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
    '.htm': 'text/html; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.mp3': 'audio/mpeg',
    '.ttf': 'font/ttf',
    '.txt': 'text/plain; charset=utf-8',
    '.svg': 'image/svg+xml',
};
/** 本机访问时优先提供常见局域网网段的邀请入口，避免把 localhost 分享给另一台电脑。 */
function shareBase(request, port) {
    const original = new URL(`http://${request.headers.host}`);
    const protocol = request.headers['x-forwarded-proto'] === 'https' ? 'https:' : 'http:';
    if (!['localhost', '127.0.0.1', '[::1]'].includes(original.hostname))
        return `${protocol}//${original.host}`;
    const addresses = Object.values(networkInterfaces())
        .flat()
        .filter((a) => a && a.family === 'IPv4' && !a.internal);
    addresses.sort(
        (a, b) =>
            (b.address.startsWith('192.168.') ? 3 : b.address.startsWith('10.') ? 2 : 1) -
            (a.address.startsWith('192.168.') ? 3 : a.address.startsWith('10.') ? 2 : 1),
    );
    return `http://${addresses[0]?.address || original.hostname}:${port}`;
}
/** 单个端口同时提供静态游戏和 WebSocket 房间，可直接在局域网或反向代理后使用。 */
export async function createGameServer({ port = 8080, host = '0.0.0.0', disconnectGrace = 60000 } = {}) {
    const manager = new RoomManager({ disconnectGrace });
    const server = http.createServer(async (req, res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        if (!['GET', 'HEAD'].includes(req.method)) {
            res.writeHead(405);
            res.end();
            return;
        }
        try {
            const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
            if (pathname === '/api/health') {
                res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
                res.end(
                    JSON.stringify({
                        game: 'emberline',
                        online: true,
                        version: 2,
                        joinBase: shareBase(req, server.address().port),
                    }),
                );
                return;
            }
            const route = pathname === '/' ? '/index.htm' : pathname;
            // 白名单只公开游戏资源，源码仓库、房间令牌、测试和服务器文件都不通过 HTTP 暴露。
            if (
                !/^\/(?:index\.htm|legacy\.htm|main\.css|legacy\.css|(?:js|fonts|image|audio)\/[^\0]+)$/.test(
                    route,
                ) ||
                route.split('/').includes('..')
            ) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            const target = await realpath(path.resolve(ROOT, '.' + route));
            if (!target.startsWith(ROOT + path.sep) || !(await stat(target)).isFile()) {
                res.writeHead(404);
                res.end();
                return;
            }
            const mime = MIME[path.extname(target).toLowerCase()];
            if (!mime) {
                res.writeHead(404);
                res.end();
                return;
            }
            const data = await readFile(target);
            res.writeHead(200, {
                'Content-Type': mime,
                'Content-Length': data.length,
                'Cache-Control': /\.(?:js|css|htm|html)$/.test(target) ? 'no-store' : 'public, max-age=86400',
            });
            res.end(req.method === 'HEAD' ? undefined : data);
        } catch {
            res.writeHead(404);
            res.end('Not found');
        }
    });
    const sockets = new Set();
    const wss = new WebSocketServer({
        noServer: true,
        maxPayload: 8192,
        // 快照是重复度很高的 JSON，开启压缩后流量约降至五分之一；小于 1KB 的输入与心跳不压缩。
        perMessageDeflate: { threshold: 1024, zlibDeflateOptions: { level: 3 }, concurrencyLimit: 8 },
    });
    server.on('upgrade', (req, socket, head) => {
        let valid = false;
        try {
            valid =
                req.url === '/ws' &&
                (!req.headers.origin || new URL(req.headers.origin).host === req.headers.host);
        } catch {}
        if (!valid || sockets.size >= 160) {
            socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
            socket.destroy();
            return;
        }
        wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
    });
    wss.on('connection', (socket) => {
        sockets.add(socket);
        socket.alive = true;
        socket.budget = 120;
        socket.budgetAt = Date.now();
        socket.on('pong', () => {
            socket.alive = true;
        });
        socket.on('error', () => {});
        socket.on('message', (raw) => {
            const now = Date.now();
            socket.budget = Math.min(120, socket.budget + (now - socket.budgetAt) * 0.07);
            socket.budgetAt = now;
            if (--socket.budget < 0) {
                socket.close(4008, 'rate limit');
                return;
            }
            try {
                manager.handle(socket, JSON.parse(raw.toString()));
            } catch {
                manager.error(socket, '操作未完成，请重试');
            }
        });
        socket.on('close', () => {
            sockets.delete(socket);
            manager.disconnect(socket);
        });
    });
    let previous = performance.now(),
        accumulator = 0,
        frame = 0;
    const simulation = setInterval(() => {
        const now = performance.now();
        accumulator += Math.min(0.1, (now - previous) / 1000);
        previous = now;
        while (accumulator >= 1 / 60) {
            manager.tick(1 / 60);
            accumulator -= 1 / 60;
            frame++;
            if (frame % 3 === 0) for (const room of manager.rooms.values()) manager.broadcast(room);
        }
    }, 1000 / 60);
    const heartbeat = setInterval(() => {
        for (const socket of sockets) {
            if (!socket.alive) {
                socket.terminate();
                continue;
            }
            socket.alive = false;
            socket.ping();
        }
    }, 20000);
    try {
        await new Promise((resolve, reject) => {
            server.once('error', reject);
            server.listen(port, host, resolve);
        });
    } catch (error) {
        clearInterval(simulation);
        clearInterval(heartbeat);
        throw error;
    }
    return {
        server,
        manager,
        port: server.address().port,
        close: async () => {
            clearInterval(simulation);
            clearInterval(heartbeat);
            for (const socket of sockets) socket.terminate();
            await new Promise((resolve) => wss.close(resolve));
            await new Promise((resolve) => server.close(resolve));
        },
    };
}
/** 作为命令行启动时输出可分享的本机和局域网入口，不修改防火墙或自动发布到公网。 */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const app = await createGameServer({
        port: Number(process.env.PORT) || 8080,
        host: process.env.HOST || '0.0.0.0',
    });
    console.log(`余烬防线联机入口：http://localhost:${app.port}/index.htm`);
    for (const interfaces of Object.values(networkInterfaces()))
        for (const address of interfaces || [])
            if (address.family === 'IPv4' && !address.internal)
                console.log(`同一网络的队友可访问：http://${address.address}:${app.port}/index.htm`);
    for (const signal of ['SIGINT', 'SIGTERM'])
        process.once(signal, () => app.close().then(() => process.exit(0)));
}
