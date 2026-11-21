import { UPGRADES } from './config.js';
import { clamp } from './game.js';
import { websocketUrl, roomStorageKey } from './paths.js';

/** 浏览器联机代理：只上传操作，接收服务器权威快照；本地战役不依赖此模块的连接。 */
export class OnlineSession {
    constructor(game, sound, onEvent) {
        this.game = game;
        this.sound = sound;
        this.onEvent = onEvent;
        this.active = false;
        this.socket = null;
        this.room = null;
        this.slot = 1;
        this.credentials = null;
        this.inputElapsed = 0;
        this.pingElapsed = 0;
        this.latency = 0;
        this.targets = new Map();
        this.lastSequence = -1;
        this.intentional = false;
        this.retryTimer = null;
        this.retryStarted = 0;
        this.retryCount = 0;
    }
    /** 读取仅属于当前标签页的恢复凭据；存储不可用时，正常组队仍然可用。 */
    saved() {
        try {
            return JSON.parse(sessionStorage.getItem(roomStorageKey()) || 'null');
        } catch {
            return null;
        }
    }
    /** 请求创建、加入或恢复房间；连接超时会明确失败，不把玩家留在无限等待状态。 */
    open(request) {
        if (this.socket && this.socket.readyState < 2) this.socket.close();
        this.intentional = false;
        return new Promise((resolve, reject) => {
            const socket = new WebSocket(websocketUrl());
            this.socket = socket;
            let joined = false;
            const timeout = setTimeout(() => {
                if (!joined) {
                    socket.close();
                    reject(new Error('联机服务连接超时，请使用联机入口重试'));
                }
            }, 6000);
            socket.onopen = () => socket.send(JSON.stringify(request));
            socket.onmessage = (event) => {
                let data;
                try {
                    data = JSON.parse(event.data);
                } catch {
                    return;
                }
                if (socket !== this.socket) return;
                if (data.type === 'joined') {
                    joined = true;
                    clearTimeout(timeout);
                    this.active = true;
                    this.room = data.room;
                    this.slot = data.slot;
                    this.credentials = { code: data.room.code, token: data.token };
                    this.retryCount = 0;
                    this.retryStarted = 0;
                    try {
                        sessionStorage.setItem(roomStorageKey(), JSON.stringify(this.credentials));
                    } catch {}
                    this.hasSnapshot = false;
                    this.lastSequence = -1;
                    this.game.commandSender = (type, extra = {}) => this.send({ type, ...extra });
                    this.onEvent('room', this.room);
                    resolve(this.room);
                } else if (data.type === 'room') {
                    this.room = data.room;
                    this.onEvent('room', this.room);
                } else if (data.type === 'state') this.receive(data);
                else if (data.type === 'pong') this.latency = Math.round(performance.now() - data.stamp);
                else if (data.type === 'error') {
                    if (!joined) {
                        clearTimeout(timeout);
                        reject(new Error(data.message));
                        this.credentials = null;
                        this.clearSaved();
                    }
                    this.onEvent('error', data.message);
                } else if (data.type === 'closed') {
                    this.cleanup();
                    this.onEvent('closed', data.reason);
                }
            };
            socket.onerror = () => {
                if (!joined) {
                    clearTimeout(timeout);
                    reject(new Error('当前网址没有联机服务，请从联机服务器入口打开'));
                }
            };
            socket.onclose = (event) => {
                clearTimeout(timeout);
                if (socket !== this.socket) return;
                // 同一恢复凭据已在另一页面使用时，旧页面停止争抢席位，避免反复互踢。
                if (event?.code === 4001) {
                    this.cleanup();
                    this.onEvent('closed', '此席位已在另一个页面恢复，请使用新的页面继续');
                    return;
                }
                if (!joined) reject(new Error('房间连接已关闭'));
                if (this.intentional || !this.credentials) return;
                this.game.clearInput();
                this.game.state = 'paused';
                this.onEvent('connection', '连接中断，正在重连；作战进度已保留');
                this.reconnect();
            };
        });
    }
    /** 断线后退避重连，最多等待一分钟；成功后用原令牌恢复原席位与服务器进度。 */
    reconnect() {
        if (this.intentional || !this.credentials) return;
        if (!this.retryStarted) this.retryStarted = Date.now();
        if (Date.now() - this.retryStarted > 60000) {
            this.cleanup();
            this.onEvent('closed', '重连等待已结束，请重新组队');
            return;
        }
        clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(
            () => {
                this.retryCount++;
                this.open({ type: 'resumeRoom', ...this.credentials }).catch(() => {
                    if (this.credentials) this.reconnect();
                    else {
                        this.cleanup();
                        this.onEvent('closed', '房间已失效，请重新组队');
                    }
                });
            },
            Math.min(5000, 500 * 2 ** Math.min(this.retryCount, 3)),
        );
    }
    /** 可靠命令沿 WebSocket 顺序发送；离线时不缓存技能以免恢复瞬间误放。 */
    send(message) {
        if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
    }
    /** 将位置按实体编号插值；新敌人和跨战区传送直接落位，避免从地图一端滑入。 */
    receive(data) {
        if (!this.active || data.seq < this.lastSequence) return;
        this.lastSequence = data.seq;
        const previous = new Map(
            [...this.game.players, ...this.game.enemies].map((e) => [
                `${e.netId ? 'e' : 'p'}${e.netId || e.id}`,
                e,
            ]),
        );
        const snapshot = data.snapshot;
        Object.assign(this.game, snapshot);
        this.game.choices = (snapshot.choices || [])
            .map((id) => UPGRADES.find((u) => u.id === id))
            .filter(Boolean);
        // 记录上一张快照的目标点，用两次快照之差估算速度，在快照间隔内平滑外推，
        // 消除 20Hz 快照造成的「走一步停一下」顿挫。
        const now = performance.now(),
            interval = clamp((now - (this.lastSnapshotAt || now)) / 1000, 0.03, 0.2);
        this.lastSnapshotAt = now;
        const oldTargets = this.targets;
        this.targets = new Map();
        for (const e of [...this.game.players, ...this.game.enemies]) {
            const key = `${e.netId ? 'e' : 'p'}${e.netId || e.id}`,
                old = previous.get(key),
                lastTarget = oldTargets.get(key);
            const jumped = !lastTarget || Math.hypot(e.x - lastTarget.serverX, e.y - lastTarget.serverY) > 120;
            this.targets.set(key, {
                x: e.x,
                y: e.y,
                serverX: e.x,
                serverY: e.y,
                vx: jumped ? 0 : (e.x - lastTarget.serverX) / interval,
                vy: jumped ? 0 : (e.y - lastTarget.serverY) / interval,
                age: 0,
            });
            const own = !e.netId && e.id === this.slot;
            // 自己的战车由本地预测驱动，只有偏差过大（传送、复活、跨战区）时才直接落到服务器位置。
            if (old && Math.hypot(e.x - old.x, e.y - old.y) < (own ? 140 : 180)) {
                e.x = old.x;
                e.y = old.y;
                if (own && e.hp > 0) {
                    e.angle = old.angle;
                    e.bodyAngle = old.bodyAngle;
                }
            }
        }
        if (!this.hasSnapshot) {
            this.hasSnapshot = true;
            this.onEvent('sync', snapshot.state);
        }
        // 服务器只下发爆裂参数，火花粒子在本机生成并由本地 updateEffects 推进。
        if (Array.isArray(data.bursts))
            for (const burst of data.bursts.slice(0, 120)) if (Array.isArray(burst)) this.game.burst(...burst);
        for (const event of data.events || []) {
            if (event.type === 'sound') this.sound.play(event.event, event.options);
            else if (event.type === 'game')
                this.onEvent(event.event, event.event === 'upgrade' ? this.game.choices : event.data);
        }
    }
    /** 二十到二十五次每秒上传 WASD 与瞄准，两个席位均使用自己的键鼠或触屏操作。 */
    update(dt) {
        if (!this.active) return;
        const g = this.game;
        const input = this.readInput();
        const me = g.players.find((player) => player.id === this.slot);
        // 本地预测：按下方向键即在本机移动自己的战车（使用同一套掩体碰撞），无需等待网络往返。
        if (me && me.hp > 0 && g.state === 'playing' && !(me.dashTime > 0)) {
            g.move(me, input.x * me.speed * dt, input.y * me.speed * dt);
            if (Math.hypot(input.x, input.y) > 0.1) {
                me.bodyAngle = Math.atan2(input.y, input.x);
                me.moving = true;
            }
            if (input.aim !== null) me.angle = input.aim;
        }
        for (const entity of [...g.players, ...g.enemies]) {
            const target = this.targets.get(`${entity.netId ? 'e' : 'p'}${entity.netId || entity.id}`);
            if (!target) continue;
            // 外推最多 0.15 秒，网络暂停时不会让敌人无限滑走。
            if (g.state === 'playing' && target.age < 0.15) {
                target.x += target.vx * dt;
                target.y += target.vy * dt;
                target.age += dt;
            }
            // 自己的战车只做缓慢校正（静止时更快贴合），其他实体快速贴合外推后的目标点。
            const own = entity === me,
                rate = own ? (Math.hypot(input.x, input.y) > 0.1 ? 4 : 10) : 18;
            const amount = 1 - Math.exp(-dt * rate);
            entity.x += (target.x - entity.x) * amount;
            entity.y += (target.y - entity.y) * amount;
        }
        // 弹道在快照间短暂外推，避免二十帧的网络节奏直接变成渲染卡顿。
        if (g.state === 'playing')
            for (const bullet of g.bullets) {
                bullet.x += bullet.vx * dt;
                bullet.y += bullet.vy * dt;
            }
        this.inputElapsed += dt;
        this.pingElapsed += dt;
        if (this.inputElapsed >= 0.04) {
            this.inputElapsed = 0;
            this.send({
                type: 'input',
                x: input.x,
                y: input.y,
                aim: input.aim,
                fire:
                    g.state === 'playing' &&
                    (g.pointer.down || g.touchFire || g.keys.has('Space') || g.autoFire),
            });
        }
        if (this.pingElapsed > 2) {
            this.pingElapsed = 0;
            this.send({ type: 'ping', stamp: performance.now() });
        }
    }
    /**
     * 读取本机操作：WASD 与触屏摇杆合成方向（长度不超过 1），鼠标位置换算为炮塔角度。
     * 返回 { x, y, aim }；aim 为 null 表示交给服务器自动瞄准最近敌军。
     */
    readInput() {
        const g = this.game,
            p = g.players.find((player) => player.id === this.slot);
        let x = Number(g.keys.has('KeyD')) - Number(g.keys.has('KeyA')) + g.stick.x;
        let y = Number(g.keys.has('KeyS')) - Number(g.keys.has('KeyW')) + g.stick.y;
        const length = Math.hypot(x, y);
        if (length > 1) {
            x /= length;
            y /= length;
        }
        const aim = p && g.pointer.used && !g.touchFire ? Math.atan2(g.pointer.y - p.y, g.pointer.x - p.x) : null;
        return { x, y, aim };
    }
    /** 主动离开不触发重连，关闭整个双人房间，双方回到可重新组队的状态。 */
    leave() {
        this.send({ type: 'leave' });
        this.cleanup();
    }
    /** 清理连接和输入，但不触碰游戏最高分等非联机设置。 */
    cleanup() {
        this.intentional = true;
        clearTimeout(this.retryTimer);
        this.active = false;
        this.room = null;
        this.credentials = null;
        this.lastSequence = -1;
        this.game.commandSender = null;
        this.game.clearInput();
        this.targets.clear();
        this.clearSaved();
        const socket = this.socket;
        this.socket = null;
        socket?.close();
    }
    /** 删除本次房间凭据，防止关闭房间后刷新页面重复尝试恢复。 */
    clearSaved() {
        try {
            sessionStorage.removeItem(roomStorageKey());
        } catch {}
    }
}
