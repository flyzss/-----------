import { randomBytes, randomInt } from 'node:crypto';
import { Game } from '../js/game.js';
import { createSnapshot, sanitizeInput } from '../js/protocol.js';
import { ZONES } from '../js/config.js';

/** 房间管理器独立于 HTTP 层，真实服务器和网络回归测试共用同一套状态机。 */
export class RoomManager {
    constructor({ disconnectGrace = 60000, maxRooms = 64 } = {}) {
        this.rooms = new Map();
        this.disconnectGrace = disconnectGrace;
        this.maxRooms = maxRooms;
    }
    /**
     * 发送失败只影响该连接。缓冲极端堆积（> 2MB，通常意味着连接已失活）才断开；
     * 普通的慢网络由 broadcast 跳过旧快照处理，不再因手机网络抖动被踢下线。
     */
    send(socket, message) {
        if (socket?.readyState !== 1) return;
        if (socket.bufferedAmount >= 2000000) {
            socket.terminate();
            return;
        }
        socket.send(JSON.stringify(message));
    }
    /** 公共房间信息不包含重连令牌，房间码也不出现在公开房间列表中。 */
    publicRoom(room) {
        return {
            code: room.code,
            chapter: room.chapter,
            phase: room.game?.state || 'lobby',
            players: room.peers.map((p) => ({ slot: p.slot, connected: !!p.socket, ready: p.ready })),
            votes: room.votes,
            pauseReason: room.pauseReason || '',
        };
    }
    /** 房间状态变化单独通知，浏览器无需每帧重建房间表单。 */
    status(room) {
        for (const p of room.peers) this.send(p.socket, { type: 'room', room: this.publicRoom(room) });
    }
    /** 加入成功时仅向本人返回令牌；令牌在当前标签页保存，用于刷新及网络恢复。 */
    assign(room, peer, socket) {
        const old = peer.socket;
        peer.socket = socket;
        peer.disconnectedAt = 0;
        socket.room = room;
        socket.peer = peer;
        socket.lastInput = 0;
        this.send(socket, {
            type: 'joined',
            room: this.publicRoom(room),
            slot: peer.slot,
            token: peer.token,
        });
        if (old && old !== socket) old.close(4001, 'replaced');
        if (room.game)
            this.send(socket, {
                type: 'state',
                snapshot: createSnapshot(room.game),
                events: [],
                seq: room.seq,
            });
        if (room.linkPaused && room.peers.length === 2 && room.peers.every((p) => p.socket)) {
            room.linkPaused = false;
            room.pauseReason = '';
            if (room.game.state === 'paused') room.game.resume();
        }
        this.status(room);
    }
    /** 所有协议入口集中校验：身份绑定 socket，玩家不能通过消息冒充另一席位。 */
    handle(socket, message) {
        if (!message || typeof message !== 'object' || Array.isArray(message)) return;
        const type = message.type;
        if (type === 'ping') {
            this.send(socket, { type: 'pong', stamp: message.stamp });
            return;
        }
        if (type === 'create') {
            if (socket.room) return this.error(socket, '请先离开当前房间');
            if (this.rooms.size >= this.maxRooms) return this.error(socket, '房间已满，请稍后重试');
            let code;
            const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            do {
                code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
            } while (this.rooms.has(code));
            const room = {
                code,
                chapter: Math.max(
                    0,
                    Math.min(ZONES.length - 1, Number.isInteger(message.chapter) ? message.chapter : 0),
                ),
                peers: [],
                votes: {},
                events: [],
                seq: 0,
                createdAt: Date.now(),
                lastActive: Date.now(),
                game: null,
            };
            const peer = { slot: 1, token: randomBytes(24).toString('hex'), socket: null, ready: false };
            room.peers.push(peer);
            this.rooms.set(code, room);
            this.assign(room, peer, socket);
            return;
        }
        if (type === 'join' || type === 'resumeRoom') {
            if (socket.room) return this.error(socket, '已经在房间中');
            const code = typeof message.code === 'string' ? message.code.trim().toUpperCase() : '';
            const room = this.rooms.get(code);
            if (!room) return this.error(socket, '房间不存在或已关闭');
            let peer;
            if (type === 'resumeRoom') {
                peer = room.peers.find((p) => typeof message.token === 'string' && p.token === message.token);
                if (!peer) return this.error(socket, '重连凭据已失效，请重新加入');
            } else {
                if (room.peers.length >= 2 || room.game) return this.error(socket, '房间已满或正在作战');
                peer = { slot: 2, token: randomBytes(24).toString('hex'), socket: null, ready: false };
                room.peers.push(peer);
            }
            this.assign(room, peer, socket);
            return;
        }
        const room = socket.room,
            peer = socket.peer;
        if (!room || !peer || peer.socket !== socket) return this.error(socket, '请先创建或加入房间');
        room.lastActive = Date.now();
        if (type === 'leave') {
            this.close(room, '队友已离开房间');
            return;
        }
        if (type === 'ready' && !room.game) {
            peer.ready = message.ready === true;
            this.status(room);
            return;
        }
        if (type === 'start') {
            if (peer.slot !== 1) return this.error(socket, '由房主启动行动');
            if (room.peers.length !== 2 || !room.peers.every((p) => p.socket && p.ready))
                return this.error(socket, '等待两位指挥官连接并准备');
            if (room.game && !['won', 'lost'].includes(room.game.state)) return;
            room.events = [];
            room.votes = {};
            room.linkPaused = false;
            room.pauseReason = '';
            room.game = new Game(
                {
                    play: (event, options) => room.events.push({ type: 'sound', event, options }),
                    update() {},
                },
                (event, data) => {
                    if (event === 'upgrade') room.votes = {};
                    if (['upgrade', 'pause', 'resume', 'finish'].includes(event)) this.status(room);
                    room.events.push({
                        type: 'game',
                        event,
                        data: event === 'upgrade' ? data.map((u) => u.id) : data,
                    });
                },
            );
            // 服务器记录爆裂参数而非粒子本体，随快照下发给客户端本地生成。
            room.game.burstLog = [];
            room.game.start(2, room.chapter);
            this.status(room);
            this.broadcast(room);
            return;
        }
        const game = room.game;
        if (!game) return;
        if (type === 'input') {
            game.controls.set(peer.slot, sanitizeInput(message));
            socket.lastInput = Date.now();
            return;
        }
        if (type === 'dash') game.dash(peer.slot);
        if (type === 'nova') game.nova(peer.slot);
        if (type === 'support') game.deployTurret(peer.slot);
        if (type === 'pause' && game.state === 'playing') {
            room.pauseReason = `P${peer.slot} 暂停了行动`;
            game.pause();
            this.status(room);
        }
        if (type === 'resume') {
            if (!room.peers.every((p) => p.socket)) return this.error(socket, '队友尚未恢复连接');
            room.pauseReason = '';
            game.resume();
            this.status(room);
        }
        if (type === 'vote' && game.state === 'upgrade' && game.choices.some((u) => u.id === message.id)) {
            room.votes[peer.slot] = message.id;
            this.status(room);
            if (room.peers.every((p) => room.votes[p.slot])) {
                const choice = room.votes[1];
                if (room.votes[1] !== room.votes[2])
                    room.events.push({
                        type: 'game',
                        event: 'toast',
                        data: '改装意见不同，本轮采用房主的选择',
                    });
                game.chooseUpgrade(choice);
                room.votes = {};
                this.status(room);
            }
        }
    }
    /** 断线立即冻结作战，保留席位与进度；重连窗口内恢复，不让残留输入继续行走。 */
    disconnect(socket) {
        const room = socket.room,
            peer = socket.peer;
        if (!room || peer?.socket !== socket || !this.rooms.has(room.code)) return;
        peer.socket = null;
        peer.disconnectedAt = Date.now();
        room.game?.controls.set(peer.slot, { x: 0, y: 0, fire: false, aim: null });
        if (room.game?.state === 'playing') {
            room.linkPaused = true;
            room.pauseReason = '队友断线，等待恢复连接';
            room.game.pause();
        }
        this.status(room);
    }
    /** 固定时间步推进，输入超过 350 毫秒没有更新则清空，避免后台或网络停顿造成卡键。 */
    tick(dt) {
        const now = Date.now();
        for (const room of this.rooms.values()) {
            if (
                room.peers.some(
                    (p) => !p.socket && p.disconnectedAt && now - p.disconnectedAt > this.disconnectGrace,
                )
            ) {
                this.close(room, '重连等待已结束，请重新组队');
                continue;
            }
            if (now - room.lastActive > 30 * 60 * 1000) {
                this.close(room, '房间长时间未活动，已关闭');
                continue;
            }
            if (!room.game || !room.peers.every((p) => p.socket)) continue;
            for (const peer of room.peers)
                if (now - peer.socket.lastInput > 350)
                    room.game.controls.set(peer.slot, { x: 0, y: 0, fire: false, aim: null });
            room.game.update(dt);
        }
    }
    /** 状态广播采用丢弃旧帧而不堆积的策略；逻辑事件随下一张快照可靠有序发送。 */
    broadcast(room) {
        if (!room.game) return;
        const snapshot = createSnapshot(room.game),
            events = room.events.splice(0, 160),
            bursts = (room.game.burstLog || []).splice(0);
        room.seq++;
        for (const peer of room.peers) {
            // 每位玩家独立积压事件：发送缓冲尚未排空（> 96KB）时跳过本帧快照，
            // 但把音效、改装、结算等逻辑事件留到下一张快照，保证不会丢失改装弹窗等关键提示。
            peer.backlog = (peer.backlog || []).concat(events);
            if (peer.backlog.length > 200) peer.backlog.splice(0, peer.backlog.length - 200);
            if (!peer.socket || peer.socket.bufferedAmount > 96000) continue;
            this.send(peer.socket, {
                type: 'state',
                seq: room.seq,
                snapshot,
                events: peer.backlog,
                bursts,
            });
            peer.backlog = [];
        }
        if (room.events.length > 160) room.events.splice(0, room.events.length - 160);
    }
    /** 关闭房间时通知参与者并解绑，连接本身可继续用于下一次组队。 */
    close(room, reason) {
        for (const peer of room.peers) {
            this.send(peer.socket, { type: 'closed', reason });
            if (peer.socket) {
                peer.socket.room = null;
                peer.socket.peer = null;
            }
        }
        this.rooms.delete(room.code);
    }
    /** 对玩家只返回可恢复的中文说明，不暴露服务端内部异常栈。 */
    error(socket, message) {
        this.send(socket, { type: 'error', message });
    }
}
