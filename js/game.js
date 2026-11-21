import { WORLD, WAVES, ENEMIES, UPGRADES } from './config.js';

/** 数值工具集中定义，碰撞和距离始终使用逻辑战场坐标而非屏幕像素。 */
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const random = (min, max) => min + Math.random() * (max - min);
const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

/** 判断线段与圆是否相交，避免高速炮弹在低帧率时穿过目标。 */
function segmentCircle(x1, y1, x2, y2, target, radius) {
    const dx = x2 - x1,
        dy = y2 - y1;
    const t = clamp(((target.x - x1) * dx + (target.y - y1) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return Math.hypot(x1 + dx * t - target.x, y1 + dy * t - target.y) <= radius;
}

/** 游戏模拟层：单一时钟管理移动、AI、弹道、掉落和生命周期，暂停不会泄漏定时器。 */
export class Game {
    constructor(sound, onEvent) {
        this.sound = sound;
        this.onEvent = onEvent;
        this.keys = new Set();
        this.pointer = { x: 640, y: 200, down: false, used: false };
        this.stick = { x: 0, y: 0 };
        this.touchFire = false;
        this.autoFire = false;
        this.mode = 1;
        this.reset();
        this.state = 'menu';
        this.enemies = [
            this.makeEnemy('raider', 940, 240),
            this.makeEnemy('heavy', 1090, 390),
            this.makeEnemy('scout', 850, 115),
        ];
    }
    /** 重置本局所有资源；保留按键容器和设置，清空上一局粒子、升级与路径数据。 */
    reset() {
        this.time = 0;
        this.wave = 0;
        this.score = 0;
        this.kills = 0;
        this.combo = 0;
        this.comboTime = 0;
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.rings = [];
        this.texts = [];
        this.pickups = [];
        this.wrecks = [];
        this.upgrades = [];
        this.shake = 0;
        this.camera = { x: 0, y: 0, vx: 0, vy: 0 };
        this.impacts = [];
        this.hitstop = 0;
        this.flash = 0;
        this.whiteFlash = { life: 0, maxLife: 1, strength: 0 };
        this.whiteFlashCooldown = 0;
        this.waveDelay = 0;
        this.core = { x: 640, y: 664, radius: 36, hp: 500, maxHp: 500, hit: 0 };
        this.players = [this.makePlayer(1, this.mode === 2 ? 556 : 545, 631)];
        if (this.mode === 2) this.players.push(this.makePlayer(2, 724, 631));
        this.makeMap();
        this.keys.clear();
        this.pointer.down = false;
        this.touchFire = false;
        this.stick = { x: 0, y: 0 };
    }
    /** 玩家属性以秒和逻辑像素计量，避免刷新率影响火力与移动速度。 */
    makePlayer(id, x, y) {
        return {
            id,
            x,
            y,
            radius: 19,
            angle: -Math.PI / 2,
            bodyAngle: -Math.PI / 2,
            hp: 100,
            maxHp: 100,
            speed: 210,
            damage: 24,
            fireRate: 0.22,
            fireCd: 0,
            bulletSpeed: 760,
            multishot: 0,
            pierce: 0,
            invincible: 1.5,
            dashCd: 0,
            dashMax: 2.8,
            dashTime: 0,
            dashAngle: 0,
            novaCd: 0,
            novaMax: 12,
            novaDamage: 110,
            recoil: 0,
            hit: 0,
            moving: false,
            tread: 0,
            deadTime: 0,
            color: id === 1 ? '#b6d2a0' : '#8bbacb',
        };
    }
    /** 生成手工布置的掩体群：主通道保持畅通，混凝土可破坏，钢墙用于稳定战场结构。 */
    makeMap() {
        this.walls = [];
        const block = (x, y, w, h, steel = false) => {
            for (let row = 0; row < h; row++)
                for (let col = 0; col < w; col++) {
                    this.walls.push({
                        x: x + col * 40,
                        y: y + row * 40,
                        w: 40,
                        h: 40,
                        hp: steel ? Infinity : 85,
                        maxHp: 85,
                        steel,
                        hit: 0,
                        seed: Math.random(),
                    });
                }
        };
        block(240, 160, 3, 2);
        block(880, 160, 3, 2);
        block(440, 320, 2, 1);
        block(760, 320, 2, 1);
        block(160, 400, 2, 3);
        block(1040, 400, 2, 3);
        block(360, 520, 2, 2);
        block(840, 520, 2, 2);
        block(560, 160, 1, 2, true);
        block(680, 160, 1, 2, true);
        block(80, 160, 1, 2, true);
        block(1160, 160, 1, 2, true);
        this.mapVersion = (this.mapVersion || 0) + 1;
    }
    /** 开战入口由一次用户操作触发，音频解锁在界面控制层完成。 */
    start(mode = 1) {
        this.mode = mode;
        this.reset();
        this.state = 'playing';
        this.beginWave();
        this.onEvent('start');
    }
    /** 每波使用独立生成队列；清场后才进入改装，首领固定出现在最终波。 */
    beginWave() {
        this.wave++;
        this.spawned = 0;
        this.spawnTimer = 2.5;
        this.waveDelay = 0;
        this.sound.play('wave');
        this.players.forEach((p) => {
            p.invincible = Math.max(p.invincible, 2);
        });
        this.onEvent('wave', WAVES[this.wave - 1]);
    }
    /** 创建敌人时按波次和人数轻度缩放耐久，双人有更多火力但共享核心。 */
    makeEnemy(type, x, y) {
        const data = ENEMIES[type];
        const hp = data.hp * (1 + Math.max(0, this.wave - 1) * 0.065) * (this.mode === 2 ? 1.5 : 1);
        return {
            ...data,
            type,
            x,
            y,
            hp,
            maxHp: hp,
            angle: Math.PI / 2,
            bodyAngle: Math.PI / 2,
            fireCd: random(0.8, 2.5),
            pathCd: 0,
            path: [],
            hit: 0,
            recoil: 0,
            tread: 0,
            moving: false,
            warning: 0.8,
            radialCd: 5,
            charge: 0,
            dead: false,
            targetCore: Math.random() > 0.4,
        };
    }
    /** 敌军从可见空投标记进入，预警期间不移动、不射击。 */
    spawnEnemy() {
        const config = WAVES[this.wave - 1];
        const portals = [
            { x: 160, y: 75 },
            { x: 640, y: 65 },
            { x: 1120, y: 75 },
            { x: 55, y: 330 },
            { x: 1225, y: 330 },
        ];
        let type = config.types[this.spawned % config.types.length];
        if (config.boss && this.spawned === 0) type = 'boss';
        const spot = type === 'boss' ? portals[1] : portals[Math.floor(Math.random() * portals.length)];
        const enemy = this.makeEnemy(type, spot.x + random(-10, 10), spot.y);
        this.enemies.push(enemy);
        this.spawned++;
        this.rings.push({
            x: enemy.x,
            y: enemy.y,
            radius: 8,
            max: enemy.radius + 35,
            life: 0.8,
            maxLife: 0.8,
            color: '#f3a15c',
        });
    }
    /** 统一更新顺序确保死亡目标不会再次射击，暂停与界面选择期间不推进战斗。 */
    update(dt) {
        if (this.state !== 'playing') {
            if (this.state === 'menu') this.updateEffects(dt);
            this.sound.update(false, 0);
            return;
        }
        if (this.hitstop > 0) {
            this.hitstop -= dt;
            // 受击停顿只冻结模拟，火光与镜头仍按真实时间推进，反馈不再拖成慢动作。
            this.updateEffects(dt);
            return;
        }
        this.time += dt;
        this.comboTime -= dt;
        if (this.comboTime <= 0) this.combo = 0;
        this.core.hit = Math.max(0, this.core.hit - dt);
        this.players.forEach((p) => this.updatePlayer(p, dt));
        if (this.state !== 'playing') return;
        this.enemies.forEach((e) => this.updateEnemy(e, dt));
        this.updateBullets(dt);
        this.enemies = this.enemies.filter((e) => !e.dead);
        this.updatePickups(dt);
        this.updateEffects(dt);
        if (this.core.hp <= 0) {
            this.finish(false);
            return;
        }
        const config = WAVES[this.wave - 1];
        this.spawnTimer -= dt;
        if (this.spawned < config.count && this.spawnTimer <= 0 && this.enemies.length < 18) {
            this.spawnEnemy();
            this.spawnTimer = config.interval;
        }
        if (this.spawned >= config.count && !this.enemies.length) {
            this.waveDelay += dt;
            if (this.waveDelay > 2) this.completeWave();
        }
        this.sound.update(true, Math.min(1, this.enemies.length / 10));
    }
    /** 玩家移动、武器、冷却和复活：核心仍有能量时，阵亡者七秒后消耗核心耐久重返战场。 */
    updatePlayer(p, dt) {
        p.hit = Math.max(0, p.hit - dt);
        p.invincible = Math.max(0, p.invincible - dt);
        p.recoil = Math.max(0, p.recoil - dt * 110);
        p.fireCd -= dt;
        p.dashCd = Math.max(0, p.dashCd - dt);
        p.novaCd = Math.max(0, p.novaCd - dt);
        if (p.hp <= 0) {
            p.deadTime += dt;
            if (p.deadTime >= 7) {
                if (this.core.hp > 45) {
                    this.core.hp -= 40;
                    p.hp = p.maxHp;
                    p.x = p.id === 1 ? 545 : 735;
                    p.y = 660;
                    p.invincible = 3;
                    p.deadTime = 0;
                    this.onEvent('toast', `P${p.id} 已重返战场 · 核心消耗 40 耐久`);
                    this.burst(p.x, p.y, '#b9edac', 25, 120);
                } else if (this.players.every((player) => player.hp <= 0)) this.finish(false);
            }
            return;
        }
        const keys = this.keys;
        let dx = 0,
            dy = 0;
        if (p.id === 1) {
            dx = Number(keys.has('KeyD')) - Number(keys.has('KeyA')) + this.stick.x;
            dy = Number(keys.has('KeyS')) - Number(keys.has('KeyW')) + this.stick.y;
        } else {
            dx = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'));
            dy = Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp'));
        }
        const length = Math.hypot(dx, dy);
        if (length > 1) {
            dx /= length;
            dy /= length;
        }
        p.moving = length > 0.1;
        if (p.moving) p.bodyAngle = Math.atan2(dy, dx);
        if (p.id === 1 && this.pointer.used && !this.touchFire) p.angle = angleTo(p, this.pointer);
        else {
            const target = this.nearestEnemy(p);
            if (target) p.angle = angleTo(p, target);
            else if (p.moving) p.angle = p.bodyAngle;
        }
        if (p.dashTime > 0) {
            p.dashTime -= dt;
            this.move(p, Math.cos(p.dashAngle) * 740 * dt, Math.sin(p.dashAngle) * 740 * dt);
            if (Math.random() < 0.6) this.burst(p.x, p.y, p.color, 2, 35);
        } else this.move(p, dx * p.speed * dt, dy * p.speed * dt);
        if (p.moving) p.tread += dt * p.speed;
        const shooting =
            p.id === 1
                ? keys.has('Space') || this.pointer.down || this.touchFire || this.autoFire
                : keys.has('Numpad0') || keys.has('Enter');
        if (shooting && p.fireCd <= 0) {
            this.fire(p, false);
            p.fireCd = p.fireRate;
        }
    }
    /** 冲刺沿移动方向释放；静止时沿炮塔方向冲刺，持续无敌但不能穿墙。 */
    dash(id) {
        const p = this.players.find((player) => player.id === id);
        if (this.state !== 'playing' || !p || p.hp <= 0 || p.dashCd > 0) return;
        p.dashAngle = p.moving ? p.bodyAngle : p.angle;
        p.dashTime = 0.21;
        p.dashCd = p.dashMax;
        p.invincible = Math.max(p.invincible, 0.32);
        this.sound.play('dash');
        this.rings.push({ x: p.x, y: p.y, radius: 10, max: 50, life: 0.3, maxLife: 0.3, color: p.color });
    }
    /** 震荡同时清除范围弹幕并损伤敌军，给玩家主动脱险与破阵的手段。 */
    nova(id) {
        const p = this.players.find((player) => player.id === id);
        if (this.state !== 'playing' || !p || p.hp <= 0 || p.novaCd > 0) return;
        p.novaCd = p.novaMax;
        this.rings.push({
            x: p.x,
            y: p.y,
            radius: 10,
            max: 260,
            life: 0.65,
            maxLife: 0.65,
            color: '#c9efbb',
            fill: true,
        });
        this.enemies.forEach((e) => {
            if (distance(e, p) < 260) this.damageEnemy(e, p.novaDamage, true);
        });
        this.bullets = this.bullets.filter((b) => !b.enemy || distance(b, p) > 280);
        this.shake = 12;
        this.flash = 0.12;
        this.hitstop = 0.045;
        this.kickCamera(-Math.PI / 2, 170);
        this.flashScreen(0.46, 0.11);
        this.sound.play('nova', { x: p.x });
        this.burst(p.x, p.y, '#dbf2b8', 70, 300);
    }
    /** 查找最近可锁定敌人；双人与触屏自动瞄准使用同一规则。 */
    nearestEnemy(p) {
        let target = null,
            best = 700;
        for (const enemy of this.enemies) {
            if (enemy.dead || enemy.warning > 0) continue;
            const d = distance(p, enemy);
            if (d < best) {
                best = d;
                target = enemy;
            }
        }
        return target;
    }
    /** 检测圆形车体与轴对齐掩体的接触，地图边界留出完整车身。 */
    blocked(x, y, radius) {
        if (
            x < radius + 12 ||
            y < radius + 12 ||
            x > WORLD.width - radius - 12 ||
            y > WORLD.height - radius - 12
        )
            return true;
        return this.walls.some(
            (w) =>
                w.hp > 0 && Math.hypot(x - clamp(x, w.x, w.x + w.w), y - clamp(y, w.y, w.y + w.h)) < radius,
        );
    }
    /** 位移分段处理，长距离冲刺也不会越过单块薄墙；分轴解算可沿墙滑行。 */
    move(entity, dx, dy) {
        const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 7) || 1;
        for (let i = 0; i < steps; i++) {
            const nx = entity.x + dx / steps,
                ny = entity.y + dy / steps;
            if (!this.blocked(nx, entity.y, entity.radius)) entity.x = nx;
            if (!this.blocked(entity.x, ny, entity.radius)) entity.y = ny;
        }
    }
    /** 轻量网格寻路绕开掩体；路径只在低频重新计算，墙体销毁后自然重新规划。 */
    findPath(entity, target) {
        const size = WORLD.cell,
            cols = 32,
            rows = 20;
        const sx = clamp(Math.floor(entity.x / size), 0, cols - 1),
            sy = clamp(Math.floor(entity.y / size), 0, rows - 1);
        const tx = clamp(Math.floor(target.x / size), 1, cols - 2),
            ty = clamp(Math.floor(target.y / size), 1, rows - 2);
        const start = sy * cols + sx,
            end = ty * cols + tx;
        const queue = [start],
            previous = new Int16Array(cols * rows).fill(-1);
        previous[start] = start;
        let found = false;
        for (let index = 0; index < queue.length; index++) {
            const current = queue[index];
            if (current === end) {
                found = true;
                break;
            }
            const cx = current % cols,
                cy = Math.floor(current / cols);
            for (const [ox, oy] of [
                [0, 1],
                [1, 0],
                [-1, 0],
                [0, -1],
            ]) {
                const nx = cx + ox,
                    ny = cy + oy,
                    next = ny * cols + nx;
                if (nx < 1 || ny < 1 || nx >= cols - 1 || ny >= rows - 1 || previous[next] !== -1) continue;
                // 使用真实车体半径规划路线，让重装首领绕开普通坦克可通过的窄巷。
                if (this.blocked(nx * size + size / 2, ny * size + size / 2, entity.radius)) continue;
                previous[next] = current;
                queue.push(next);
            }
        }
        if (!found) return [];
        const path = [];
        for (let node = end; node !== start; node = previous[node])
            path.push({ x: (node % cols) * size + size / 2, y: Math.floor(node / cols) * size + size / 2 });
        return path.reverse();
    }
    /** 敌军根据距离选择追击或开火，狙击手显示瞄准线，首领半血后加快攻击。 */
    updateEnemy(e, dt) {
        if (e.dead) return;
        e.hit = Math.max(0, e.hit - dt);
        e.recoil = Math.max(0, e.recoil - dt * 80);
        if (e.warning > 0) {
            e.warning -= dt;
            return;
        }
        const alive = this.players.filter((p) => p.hp > 0);
        const nearest = alive.sort((a, b) => distance(a, e) - distance(b, e))[0];
        const target = nearest && (distance(nearest, e) < 260 || !e.targetCore) ? nearest : this.core;
        e.angle = angleTo(e, target);
        e.fireCd -= dt;
        e.pathCd -= dt;
        const d = distance(e, target);
        const obstructed = this.walls.some(
            (w) => w.hp > 0 && segmentCircle(e.x, e.y, target.x, target.y, { x: w.x + 20, y: w.y + 20 }, 28),
        );
        e.moving = d > e.range * 0.78 || obstructed;
        if (e.moving) {
            if (e.pathCd <= 0) {
                e.path = this.findPath(e, target);
                e.pathCd = random(0.65, 1.1);
            }
            while (e.path.length && distance(e, e.path[0]) < 22) e.path.shift();
            const waypoint = e.path[0] || target;
            const angle = angleTo(e, waypoint);
            const speed = e.speed * (e.type === 'boss' && e.hp < e.maxHp / 2 ? 1.4 : 1);
            e.bodyAngle = angle;
            this.move(e, Math.cos(angle) * speed * dt, Math.sin(angle) * speed * dt);
            e.tread += speed * dt;
        }
        // 同阵营车辆轻度分离，避免在狭窄入口重叠成无法辨识的一团。
        for (const other of this.enemies) {
            if (other === e || other.dead) continue;
            const separation = distance(e, other),
                min = e.radius + other.radius + 3;
            if (separation < min && separation > 0.01)
                this.move(
                    e,
                    ((e.x - other.x) / separation) * 30 * dt,
                    ((e.y - other.y) / separation) * 30 * dt,
                );
        }
        if (d < e.range && e.fireCd <= 0) {
            this.fire(e, true);
            e.fireCd = e.cooldown * (e.type === 'boss' && e.hp < e.maxHp / 2 ? 0.65 : 1) * random(0.9, 1.2);
        }
        if (e.type === 'boss') {
            e.radialCd -= dt;
            e.charge = e.radialCd < 1.1 ? 1 - Math.max(0, e.radialCd) / 1.1 : 0;
            if (e.radialCd <= 0) {
                const count = e.hp < e.maxHp / 2 ? 20 : 14;
                for (let i = 0; i < count; i++)
                    this.createBullet(e, (i / count) * Math.PI * 2 + this.time * 0.1, true, 245, e.damage);
                e.radialCd = 5.5;
                this.sound.play('nova');
                this.rings.push({
                    x: e.x,
                    y: e.y,
                    radius: 20,
                    max: 110,
                    life: 0.5,
                    maxLife: 0.5,
                    color: '#f1a15f',
                });
            }
        }
    }
    /** 主炮统一生成弹道，双联炮和首领扇形攻击通过相同弹道规则处理。 */
    fire(entity, enemy) {
        const count = enemy ? (entity.type === 'boss' ? 3 : 1) : entity.multishot + 1;
        for (let i = 0; i < count; i++) {
            const offset = (i - (count - 1) / 2) * (enemy ? 0.17 : 0.115);
            this.createBullet(
                entity,
                entity.angle + offset,
                enemy,
                enemy ? (entity.type === 'sniper' ? 490 : 285) : entity.bulletSpeed,
                entity.damage,
            );
        }
        entity.recoil = enemy ? 7 : 14;
        const muzzle = entity.radius + 20;
        this.burst(
            entity.x + Math.cos(entity.angle) * muzzle,
            entity.y + Math.sin(entity.angle) * muzzle,
            '#ffe9a3',
            5,
            75,
        );
        this.impact(
            'muzzle',
            entity.x + Math.cos(entity.angle) * muzzle,
            entity.y + Math.sin(entity.angle) * muzzle,
            entity.angle,
            enemy ? 0.65 : 1,
        );
        this.sound.play(enemy ? 'enemy' : 'shoot', { x: entity.x });
        if (!enemy) {
            this.shake = Math.max(this.shake, 5);
            this.kickCamera(entity.angle + Math.PI, 88);
        }
    }
    /** 弹体记录已穿透目标集合，防止连续多帧对同一车辆重复结算伤害。 */
    createBullet(entity, angle, enemy, speed, damage) {
        const offset = entity.radius + 13;
        this.bullets.push({
            x: entity.x + Math.cos(angle) * offset,
            y: entity.y + Math.sin(angle) * offset,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            angle,
            enemy,
            damage,
            life: 2.7,
            radius: enemy ? 4 : 3,
            pierce: enemy ? 0 : entity.pierce,
            hitIds: new Set(),
            dead: false,
        });
    }
    /** 弹道先检查遮挡再检查目标；友军火力不损伤队友与核心。 */
    updateBullets(dt) {
        for (const b of this.bullets) {
            if (b.dead) continue;
            const ox = b.x,
                oy = b.y;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life -= dt;
            if (b.life <= 0 || b.x < 0 || b.y < 0 || b.x > WORLD.width || b.y > WORLD.height) {
                b.dead = true;
                continue;
            }
            const wall = this.walls.find((w) => w.hp > 0 && this.segmentRect(ox, oy, b.x, b.y, w));
            if (wall) {
                b.dead = true;
                wall.hit = 0.12;
                this.burst(b.x, b.y, wall.steel ? '#e6d2a1' : '#a69c73', 6, 90);
                this.impact('hit', b.x, b.y, b.angle + Math.PI, 0.6);
                if (!wall.steel) {
                    wall.hp -= b.damage;
                    if (wall.hp <= 0) {
                        this.burst(wall.x + 20, wall.y + 20, '#a49b7c', 18, 110);
                        this.mapVersion++;
                    }
                }
                continue;
            }
            if (b.enemy) {
                const player = this.players.find(
                    (p) => p.hp > 0 && segmentCircle(ox, oy, b.x, b.y, p, p.radius + b.radius),
                );
                if (player) {
                    b.dead = true;
                    this.damagePlayer(player, b.damage);
                    continue;
                }
                if (segmentCircle(ox, oy, b.x, b.y, this.core, this.core.radius + b.radius)) {
                    b.dead = true;
                    if (this.core.hit <= 0) {
                        this.core.hp = Math.max(0, this.core.hp - b.damage);
                        this.core.hit = 0.14;
                        this.shake = 7;
                        this.sound.play('hurt');
                        this.burst(this.core.x, this.core.y, '#b7e7a1', 10, 100);
                    }
                }
            } else {
                for (const enemy of this.enemies) {
                    if (enemy.dead || enemy.warning > 0 || b.hitIds.has(enemy)) continue;
                    if (segmentCircle(ox, oy, b.x, b.y, enemy, enemy.radius + b.radius)) {
                        b.hitIds.add(enemy);
                        this.damageEnemy(enemy, b.damage, false, b.angle);
                        this.burst(b.x, b.y, '#ffe5a5', 6, 110);
                        if (b.pierce-- <= 0) {
                            b.dead = true;
                            break;
                        }
                    }
                }
            }
        }
        this.bullets = this.bullets.filter((b) => !b.dead);
    }
    /** 线段与矩形裁剪；使用进入/退出参数避免薄墙漏判。 */
    segmentRect(x1, y1, x2, y2, rect) {
        let near = 0,
            far = 1;
        const dx = x2 - x1,
            dy = y2 - y1;
        for (const [p, q] of [
            [-dx, x1 - rect.x],
            [dx, rect.x + rect.w - x1],
            [-dy, y1 - rect.y],
            [dy, rect.y + rect.h - y1],
        ]) {
            if (p === 0) {
                if (q < 0) return false;
                continue;
            }
            const t = q / p;
            if (p < 0) near = Math.max(near, t);
            else far = Math.min(far, t);
            if (near > far) return false;
        }
        return true;
    }
    /** 装甲命中带短暂无敌，避免一帧内叠加多发炮弹造成不可读的瞬间死亡。 */
    damagePlayer(p, amount) {
        if (p.invincible > 0 || p.hp <= 0) return;
        p.hp = Math.max(0, p.hp - amount);
        p.hit = 0.18;
        p.invincible = 0.45;
        this.shake = 8;
        this.flash = 0.09;
        this.sound.play('hurt');
        this.texts.push({
            x: p.x,
            y: p.y - 30,
            text: `−${amount}`,
            color: '#ff9a7c',
            life: 0.8,
            maxLife: 0.8,
        });
        if (p.hp <= 0) {
            p.deadTime = 0;
            this.impact('explosion', p.x, p.y, p.angle, 1.2);
            this.flashScreen(0.56, 0.12);
            this.burst(p.x, p.y, '#ffa466', 45, 180);
            this.sound.play('explode');
            this.onEvent('toast', `P${p.id} 装甲损毁 · 7 秒后消耗核心能量重建`);
        }
    }
    /** 伤害统一结算击杀、连击、积分、残骸和修复掉落，范围技能也复用该入口。 */
    damageEnemy(enemy, amount, heavy = false, impactAngle = 0) {
        if (enemy.dead || enemy.warning > 0) return;
        enemy.hp -= amount;
        enemy.hit = 0.14;
        // 装甲视觉位移不会改变真实碰撞体，保留原有平衡与寻路结果。
        enemy.joltX = Math.cos(impactAngle) * (heavy ? 8 : 5);
        enemy.joltY = Math.sin(impactAngle) * (heavy ? 8 : 5);
        this.impact('hit', enemy.x, enemy.y, impactAngle + Math.PI, heavy ? 1.5 : 1);
        this.shake = Math.max(this.shake, heavy ? 16 : 10);
        this.kickCamera(impactAngle, heavy ? 260 : 180);
        this.hitstop = Math.max(this.hitstop, heavy ? 0.06 : 0.032);
        this.sound.play('hit', { x: enemy.x });
        this.texts.push({
            x: enemy.x + random(-10, 10),
            y: enemy.y - enemy.radius,
            text: `${Math.round(amount)}`,
            color: heavy ? '#c4efae' : '#eee8c7',
            life: 0.65,
            maxLife: 0.65,
        });
        if (enemy.hp <= 0) {
            enemy.dead = true;
            this.kills++;
            this.combo = Math.min(10, this.combo + 1);
            this.comboTime = 3.5;
            this.score += Math.round(enemy.score * (1 + (this.combo - 1) * 0.1));
            this.shake = Math.max(this.shake, enemy.type === 'boss' ? 40 : 22);
            this.hitstop = enemy.type === 'boss' ? 0.16 : 0.075;
            this.flashScreen(enemy.type === 'boss' ? 0.74 : 0.4, enemy.type === 'boss' ? 0.15 : 0.095);
            this.impact('explosion', enemy.x, enemy.y, impactAngle, enemy.type === 'boss' ? 2.3 : 1);
            this.kickCamera(impactAngle, enemy.type === 'boss' ? 400 : 280);
            this.sound.play('explode', { x: enemy.x, strength: enemy.type === 'boss' ? 1.25 : 1 });
            this.burst(
                enemy.x,
                enemy.y,
                '#f7a35b',
                enemy.type === 'boss' ? 120 : 35,
                enemy.type === 'boss' ? 280 : 150,
            );
            this.rings.push({
                x: enemy.x,
                y: enemy.y,
                radius: 6,
                max: enemy.radius * 3,
                life: 0.4,
                maxLife: 0.4,
                color: '#e6a65e',
            });
            this.wrecks.push({
                x: enemy.x,
                y: enemy.y,
                angle: enemy.bodyAngle,
                radius: enemy.radius,
                life: 30,
            });
            if (this.wrecks.length > 35) this.wrecks.shift();
            if (this.kills % 4 === 0 || Math.random() < 0.18)
                this.pickups.push({ x: enemy.x, y: enemy.y, life: 18, age: 0 });
        }
    }
    /** 维修模块靠近后自动吸附，修复装甲并给核心补充少量能量。 */
    updatePickups(dt) {
        for (const pickup of this.pickups) {
            pickup.life -= dt;
            pickup.age += dt;
            const player = this.players.find((p) => p.hp > 0 && distance(p, pickup) < 100);
            if (!player) continue;
            const d = distance(player, pickup);
            if (d < 28) {
                pickup.life = 0;
                player.hp = Math.min(player.maxHp, player.hp + 22);
                this.core.hp = Math.min(this.core.maxHp, this.core.hp + 8);
                this.score += 50;
                this.sound.play('pickup');
                this.texts.push({
                    x: player.x,
                    y: player.y - 35,
                    text: '+22 修复',
                    color: '#c5efa8',
                    life: 1,
                    maxLife: 1,
                });
            } else {
                pickup.x += ((player.x - pickup.x) / d) * 240 * dt;
                pickup.y += ((player.y - pickup.y) / d) * 240 * dt;
            }
        }
        this.pickups = this.pickups.filter((p) => p.life > 0);
    }
    /** 粒子有固定上限；爆炸采用少量高对比火星与慢速烟尘避免过度遮挡。 */
    burst(x, y, color, count, speed) {
        for (let i = 0; i < count; i++) {
            const angle = random(0, Math.PI * 2),
                velocity = random(speed * 0.15, speed),
                life = random(0.2, 0.8);
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                color,
                life,
                maxLife: life,
                size: random(1.2, 4),
                smoke: i % 5 === 0,
            });
        }
        if (this.particles.length > 750) this.particles.splice(0, this.particles.length - 750);
    }
    /** 击毁产生短促白闪，连续击毁最多每 0.4 秒触发一次，首领强闪可覆盖弱闪。 */
    flashScreen(strength, duration) {
        if (this.whiteFlashCooldown > 0 && strength <= this.whiteFlash.strength) return;
        this.whiteFlash = { life: duration, maxLife: duration, strength };
        this.whiteFlashCooldown = 0.4;
    }
    /** 方向冲量由弹簧镜头吸收；连续射击限制最大速度，避免镜头累积漂走。 */
    kickCamera(angle, force) {
        this.camera.vx = clamp(this.camera.vx + Math.cos(angle) * force, -400, 400);
        this.camera.vy = clamp(this.camera.vy + Math.sin(angle) * force, -400, 400);
    }
    /** 短时冲击实体统一设上限，枪口、命中和爆炸分别使用不同的生命与尺度。 */
    impact(kind, x, y, angle, strength = 1) {
        const life = kind === 'muzzle' ? 0.095 : kind === 'hit' ? 0.18 : 0.8;
        this.impacts.push({ kind, x, y, angle, strength, life, maxLife: life });
        if (this.impacts.length > 90) this.impacts.shift();
    }
    /** 纯视觉计时与实体逻辑分离，菜单演示也能保持核心呼吸和环境动画。 */
    updateEffects(dt) {
        const camera = this.camera;
        camera.vx += (-camera.x * 180 - camera.vx * 15) * dt;
        camera.vy += (-camera.y * 180 - camera.vy * 15) * dt;
        camera.x = clamp(camera.x + camera.vx * dt, -28, 28);
        camera.y = clamp(camera.y + camera.vy * dt, -28, 28);
        this.whiteFlash.life = Math.max(0, this.whiteFlash.life - dt);
        this.whiteFlashCooldown = Math.max(0, this.whiteFlashCooldown - dt);
        this.impacts.forEach((effect) => {
            effect.life -= dt;
        });
        this.impacts = this.impacts.filter((effect) => effect.life > 0);
        [...this.players, ...this.enemies].forEach((entity) => {
            entity.joltX = (entity.joltX || 0) * Math.exp(-dt * 28);
            entity.joltY = (entity.joltY || 0) * Math.exp(-dt * 28);
        });
        this.shake = Math.max(0, this.shake - dt * 65);
        this.flash = Math.max(0, this.flash - dt);
        this.walls.forEach((w) => {
            w.hit = Math.max(0, w.hit - dt);
        });
        this.particles.forEach((p) => {
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= Math.exp(-dt * 3);
            p.vy *= Math.exp(-dt * 3);
        });
        this.particles = this.particles.filter((p) => p.life > 0);
        this.rings.forEach((r) => {
            r.life -= dt;
            r.radius += (r.max - r.radius) * Math.min(1, dt * 8);
        });
        this.rings = this.rings.filter((r) => r.life > 0);
        this.texts.forEach((t) => {
            t.life -= dt;
            t.y -= dt * 32;
        });
        this.texts = this.texts.filter((t) => t.life > 0);
        this.wrecks.forEach((w) => {
            w.life -= dt;
        });
        this.wrecks = this.wrecks.filter((w) => w.life > 0);
    }
    /** 清波补给先恢复全员部分装甲，再提供不重复的三选一改装。 */
    completeWave() {
        if (this.wave >= WAVES.length) {
            this.finish(true);
            return;
        }
        this.state = 'upgrade';
        this.bullets = [];
        this.core.hp = Math.min(this.core.maxHp, this.core.hp + 15);
        this.players.forEach((p) => {
            p.hp = Math.min(p.maxHp, Math.max(p.hp, 1) + 35);
            p.dashCd = 0;
            p.novaCd = 0;
        });
        const available = UPGRADES.filter(
            (u) => !u.max || this.upgrades.filter((id) => id === u.id).length < u.max,
        );
        this.choices = available
            .map((u) => ({ u, sort: Math.random() }))
            .sort((a, b) => a.sort - b.sort)
            .slice(0, 3)
            .map((item) => item.u);
        this.sound.play('upgrade');
        this.onEvent('upgrade', this.choices);
    }
    /** 改装只允许从当前候选中选择一次，防止重复点击叠加多次升级。 */
    chooseUpgrade(id) {
        if (this.state !== 'upgrade') return;
        const upgrade = this.choices.find((u) => u.id === id);
        if (!upgrade) return;
        this.players.forEach((p) => upgrade.apply(p));
        if (id === 'repair') this.core.hp = Math.min(this.core.maxHp, this.core.hp + 150);
        this.upgrades.push(id);
        this.sound.play('upgrade');
        this.state = 'playing';
        this.onEvent('upgraded', upgrade);
        this.beginWave();
    }
    /** 暂停清理瞬时输入，避免恢复后角色自动行走或继续开火。 */
    pause() {
        if (this.state !== 'playing') return;
        this.state = 'paused';
        this.clearInput();
        this.onEvent('pause');
    }
    /** 继续游戏时保留所有实体与剩余冷却。 */
    resume() {
        if (this.state !== 'paused') return;
        this.state = 'playing';
        this.clearInput();
        this.onEvent('resume');
    }
    /** 失焦、暂停及重开共用输入释放逻辑。 */
    clearInput() {
        this.keys.clear();
        this.pointer.down = false;
        this.touchFire = false;
        this.stick.x = 0;
        this.stick.y = 0;
    }
    /** 结算后不再模拟；最高积分安全保存到本机，不引入账号或在线请求。 */
    finish(win) {
        if (this.state !== 'playing') return;
        this.state = win ? 'won' : 'lost';
        this.clearInput();
        this.sound.play(win ? 'win' : 'lose');
        try {
            this.best = Math.max(this.score, Number(localStorage.getItem('emberline-best')) || 0);
            localStorage.setItem('emberline-best', String(this.best));
        } catch {
            this.best = this.score;
        }
        this.onEvent('finish', {
            win,
            score: this.score,
            kills: this.kills,
            time: this.time,
            best: this.best,
        });
    }
}
