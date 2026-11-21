import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/game.js';
import { WAVES } from '../js/config.js';

/** 规则测试不依赖浏览器、音频设备或定时器，直接驱动同一个正式战斗模拟器。 */
function createGame(mode = 1) {
    const events = [];
    const game = new Game({ play() {}, update() {} }, (event, data) => events.push({ event, data }));
    game.start(mode);
    return { game, events };
}
/** 分段推进真实秒数，始终保留生产环境的时间步长。 */
function advance(game, seconds) {
    for (let i = 0; i < seconds * 60; i++) game.update(1 / 60);
}

test('高速弹道扫掠可命中目标，且一枚普通弹只结算一次伤害', () => {
    const { game } = createGame();
    game.walls = [];
    const p = game.players[0];
    p.x = 300;
    p.y = 400;
    p.angle = 0;
    const e = game.makeEnemy('raider', 500, 400);
    e.warning = 0;
    game.enemies = [e];
    game.createBullet(p, 0, false, 5000, 24);
    game.updateBullets(0.06);
    assert.equal(e.hp, e.maxHp - 24);
    assert.equal(game.bullets.length, 0);
});

test('可破坏掩体阻挡炮弹，钢墙保持完整', () => {
    const { game } = createGame();
    const p = game.players[0];
    p.x = 100;
    p.y = 100;
    p.angle = 0;
    const wall = { x: 180, y: 80, w: 40, h: 40, hp: 20, maxHp: 20, steel: false };
    game.walls = [wall];
    game.createBullet(p, 0, false, 1000, 24);
    game.updateBullets(0.1);
    assert.ok(wall.hp <= 0);
    assert.equal(game.bullets.length, 0);
    wall.steel = true;
    wall.hp = Infinity;
    game.createBullet(p, 0, false, 1000, 900);
    game.updateBullets(0.1);
    assert.equal(wall.hp, Infinity);
});

test('冲刺分段碰撞不会穿过薄墙', () => {
    const { game } = createGame();
    game.walls = [{ x: 400, y: 200, w: 40, h: 160, hp: Infinity, steel: true }];
    const p = game.players[0];
    p.x = 350;
    p.y = 280;
    p.angle = 0;
    game.dash(1);
    for (let i = 0; i < 15; i++) game.updatePlayer(p, 1 / 60);
    assert.ok(p.x + p.radius <= 400);
    assert.ok(p.x > 350);
    assert.ok(p.dashCd > 0);
});

test('震荡清除范围内敌弹并损伤敌军，不清除范围外弹幕', () => {
    const { game } = createGame();
    game.walls = [];
    const p = game.players[0];
    p.x = 600;
    p.y = 400;
    const e = game.makeEnemy('heavy', 700, 400);
    e.warning = 0;
    game.enemies = [e];
    game.bullets = [
        { x: 650, y: 400, enemy: true },
        { x: 1100, y: 400, enemy: true },
    ];
    game.nova(1);
    assert.equal(game.bullets.length, 1);
    assert.equal(game.bullets[0].x, 1100);
    assert.equal(e.hp, e.maxHp - p.novaDamage);
    assert.ok(p.novaCd > 0);
});

test('无敌帧阻止重复伤害，友军炮弹不伤害核心或队友', () => {
    const { game } = createGame(2);
    game.walls = [];
    game.enemies = [];
    const p = game.players[0];
    p.invincible = 0;
    game.damagePlayer(p, 10);
    game.damagePlayer(p, 10);
    assert.equal(p.hp, 90);
    p.x = 400;
    p.y = game.core.y;
    p.angle = 0;
    const other = game.players[1];
    other.x = 500;
    other.y = p.y;
    game.createBullet(p, 0, false, 1000, 100);
    game.updateBullets(0.3);
    assert.equal(other.hp, other.maxHp);
    assert.equal(game.core.hp, game.core.maxHp);
});

test('暂停冻结战斗时间和冷却，并释放所有持续输入', () => {
    const { game } = createGame();
    game.keys.add('KeyW');
    game.pointer.down = true;
    game.players[0].novaCd = 5;
    const before = game.time;
    game.pause();
    advance(game, 5);
    assert.equal(game.time, before);
    assert.equal(game.players[0].novaCd, 5);
    assert.equal(game.keys.size, 0);
    assert.equal(game.pointer.down, false);
    game.resume();
    advance(game, 0.1);
    assert.ok(game.time > before);
});

test('复活消耗核心 40 耐久，恢复玩家完整装甲并赋予保护', () => {
    const { game } = createGame();
    const p = game.players[0];
    p.hp = 0;
    p.deadTime = 6.99;
    game.updatePlayer(p, 1 / 60);
    assert.equal(game.core.hp, 460);
    assert.equal(p.hp, p.maxHp);
    assert.ok(p.invincible > 0);
});

test('核心能量不足且全员阵亡时触发失败结算', () => {
    const { game, events } = createGame(2);
    game.core.hp = 40;
    game.players.forEach((p) => {
        p.hp = 0;
        p.deadTime = 7;
    });
    game.update(1 / 60);
    assert.equal(game.state, 'lost');
    assert.equal(events.filter((e) => e.event === 'finish').length, 1);
});

test('双人改装效果一致，重复选择不会再次叠加', () => {
    const { game } = createGame(2);
    game.completeWave();
    // 固定当前候选，验证正式选择入口的单次提交约束。
    const upgrade = {
        id: 'damage',
        apply(p) {
            p.damage *= 1.3;
        },
    };
    game.choices = [upgrade];
    game.chooseUpgrade('damage');
    game.chooseUpgrade('damage');
    assert.equal(game.wave, 2);
    assert.equal(game.upgrades.length, 1);
    assert.ok(Math.abs(game.players[0].damage - 31.2) < 1e-9);
    assert.equal(game.players[1].damage, game.players[0].damage);
});

test('完整二十四关生成、清场、改装与四位首领可以正常结算胜利', () => {
    const { game } = createGame();
    const bossesSeen = new Set();
    for (let wave = 0; wave < WAVES.length; wave++) {
        const config = WAVES[wave];
        for (let index = 0; index < config.count; index++) {
            game.spawnEnemy();
            const enemy = game.enemies.at(-1);
            enemy.warning = 0;
            if (enemy.boss) bossesSeen.add(enemy.type);
            game.damageEnemy(enemy, enemy.maxHp + 1);
        }
        // 裂变车生成的子车也必须肃清，避免把尚有敌军的关卡伪装成完成。
        for (const enemy of game.enemies)
            if (!enemy.dead) {
                enemy.warning = 0;
                game.damageEnemy(enemy, enemy.maxHp + 1);
            }
        game.enemies = game.enemies.filter((e) => !e.dead);
        game.completeWave();
        if (game.state === 'upgrade') game.chooseUpgrade(game.choices[0].id);
    }
    assert.equal(game.state, 'won');
    assert.deepEqual([...bossesSeen].sort(), ['boss', 'frostBoss', 'infernoBoss', 'riftBoss'].sort());
    assert.ok(game.kills >= WAVES.reduce((sum, wave) => sum + wave.count, 0));
});

test('重新部署清空弹幕、升级、死亡状态和旧局计时', () => {
    const { game } = createGame(2);
    game.score = 123;
    game.time = 40;
    game.upgrades.push('armor');
    game.bullets.push({});
    game.players[1].hp = 0;
    game.start(1);
    assert.equal(game.players.length, 1);
    assert.equal(game.score, 0);
    assert.equal(game.time, 0);
    assert.equal(game.wave, 1);
    assert.equal(game.bullets.length, 0);
    assert.equal(game.upgrades.length, 0);
    assert.equal(game.players[0].hp, 100);
});

test('维修模块靠近后吸附并同时修复玩家和核心', () => {
    const { game } = createGame();
    const p = game.players[0];
    p.hp = 50;
    game.core.hp = 400;
    game.pickups = [{ x: p.x + 5, y: p.y, life: 10, age: 0 }];
    game.updatePickups(1 / 60);
    assert.equal(p.hp, 72);
    assert.equal(game.core.hp, 408);
    assert.equal(game.pickups.length, 0);
});

test('首领寻路按完整车体半径绕开窄巷，不生成自身无法通过的路径节点', () => {
    const { game } = createGame();
    const boss = game.makeEnemy('boss', 640, 65);
    const path = game.findPath(boss, game.core);
    assert.ok(path.length > 0);
    assert.ok(path.every((point) => !game.blocked(point.x, point.y, boss.radius)));
    // 中央两根钢墙之间不足以容纳首领，路线必须先横向绕行。
    assert.ok(path.some((point) => point.x < 535 || point.x > 745));
});

test('开火与命中生成方向反馈，停顿期间视觉继续推进而战斗时间冻结', () => {
    const { game } = createGame();
    const p = game.players[0];
    p.angle = 0;
    game.fire(p, false);
    assert.equal(p.recoil, 14);
    assert.ok(game.impacts.some((effect) => effect.kind === 'muzzle'));
    assert.ok(game.camera.vx < 0);
    const enemy = game.makeEnemy('heavy', 700, 400);
    enemy.warning = 0;
    game.enemies = [enemy];
    game.damageEnemy(enemy, 10, false, Math.PI / 2);
    assert.ok(enemy.joltY > 0);
    assert.equal(enemy.hp, enemy.maxHp - 10);
    const before = game.time,
        life = game.impacts[0].life;
    game.update(0.01);
    assert.equal(game.time, before);
    assert.ok(game.impacts[0].life < life);
});

test('冲击镜头与特效有界，重开后不残留上一局的震动与闪光', () => {
    const { game } = createGame();
    for (let i = 0; i < 200; i++) {
        game.kickCamera(0, 200);
        game.impact('hit', 0, 0, 0);
    }
    assert.ok(game.impacts.length <= 90);
    assert.ok(Math.abs(game.camera.vx) <= 400);
    for (let i = 0; i < 180; i++) game.updateEffects(1 / 60);
    assert.equal(game.impacts.length, 0);
    assert.ok(Math.abs(game.camera.x) < 0.01);
    game.start();
    assert.deepEqual(game.camera, { x: 0, y: 0, vx: 0, vy: 0 });
});

test('命中震屏分级，击毁白闪限频且首领强闪可覆盖普通白闪', () => {
    const { game } = createGame();
    const enemy = game.makeEnemy('heavy', 700, 400);
    enemy.warning = 0;
    game.damageEnemy(enemy, 1, false, 0);
    assert.ok(game.shake >= 10);
    assert.ok(game.hitstop >= 0.032);
    assert.equal(game.whiteFlash.life, 0);
    game.damageEnemy(enemy, enemy.maxHp, false, 0);
    assert.ok(game.shake >= 22);
    assert.equal(game.whiteFlash.strength, 0.4);
    game.updateEffects(0.02);
    const remaining = game.whiteFlash.life;
    game.flashScreen(0.4, 0.095);
    assert.equal(game.whiteFlash.life, remaining);
    game.flashScreen(0.74, 0.15);
    assert.equal(game.whiteFlash.strength, 0.74);
    assert.equal(game.whiteFlash.life, 0.15);
    game.start();
    assert.equal(game.whiteFlash.life, 0);
    assert.equal(game.whiteFlashCooldown, 0);
});
