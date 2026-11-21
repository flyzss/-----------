import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/game.js';
import { WAVES, ENEMIES, ZONES } from '../js/config.js';
import { createSnapshot, sanitizeInput } from '../js/protocol.js';

/** 每个场景使用正式模拟器，避免为测试复制一份不同的战斗规则。 */
function setup(chapter = 0) {
    const g = new Game({ play() {}, update() {} }, () => {});
    g.start(1, chapter);
    return g;
}

test('四个章节能直接出击，并载入不同地图和对应基础装备', () => {
    const layouts = [];
    for (let chapter = 0; chapter < ZONES.length; chapter++) {
        const g = setup(chapter);
        assert.equal(g.wave, chapter * 6 + 1);
        assert.equal(g.zone, chapter);
        assert.equal(g.players[0].maxHp, 100 + chapter * 25);
        layouts.push(JSON.stringify(g.walls.map((w) => [w.x, w.y, w.steel])));
        const boss = g.makeEnemy(WAVES[chapter * 6 + 5].boss, 640, 65);
        assert.ok(g.findPath(boss, g.core).length > 0, `战区 ${chapter} 首领必须有路可走`);
    }
    assert.equal(new Set(layouts).size, ZONES.length);
});

test('炮台部署有冷却并自动开火，到期后正常移除', () => {
    const g = setup();
    g.walls = [];
    g.enemies = [g.makeEnemy('heavy', 650, 450)];
    g.enemies[0].warning = 0;
    g.deployTurret(1);
    g.deployTurret(1);
    assert.equal(g.turrets.length, 1);
    g.updateField(0.1);
    assert.ok(g.bullets.length > 0);
    assert.ok(g.players[0].supportCd > 0);
    g.updateField(13);
    assert.equal(g.turrets.length, 0);
});

test('炮击先预警后造成范围伤害，冲刺无敌可以规避', () => {
    const g = setup(),
        p = g.players[0];
    p.invincible = 0;
    g.addHazard(p.x, p.y, 24);
    g.updateField(1);
    assert.equal(p.hp, 100);
    g.updateField(0.7);
    assert.equal(p.hp, 76);
    assert.ok(g.hazards[0].detonated);
    g.addHazard(p.x, p.y, 24);
    p.invincible = 2;
    g.updateField(1.7);
    assert.equal(p.hp, 76);
});

test('信标需要持续占领，完成后仅结算一次修复与积分', () => {
    const g = setup();
    g.wave = 2;
    g.beginWave();
    g.core.hp = 300;
    g.enemies = [];
    const p = g.players[0];
    p.x = g.beacon.x;
    p.y = g.beacon.y;
    for (let i = 0; i < 4; i++) g.updateField(1);
    assert.equal(g.beacon.done, true);
    assert.equal(g.core.hp, 365);
    assert.equal(g.score, 500);
    g.updateField(10);
    assert.equal(g.score, 500);
});

test('工兵维修附近友军，裂变车生成子车，自爆车近身造成伤害', () => {
    const g = setup();
    g.walls = [];
    const engineer = g.makeEnemy('engineer', 500, 400),
        ally = g.makeEnemy('heavy', 540, 400);
    engineer.warning = 0;
    engineer.healCd = 0;
    ally.hp = 20;
    g.enemies = [engineer, ally];
    g.updateEnemy(engineer, 0.02);
    assert.ok(ally.hp > 20);
    const splitter = g.makeEnemy('splitter', 800, 400);
    splitter.warning = 0;
    g.enemies = [splitter];
    g.damageEnemy(splitter, 999);
    assert.equal(g.enemies.filter((e) => !e.dead).length, 2);
    const p = g.players[0];
    p.invincible = 0;
    const bomber = g.makeEnemy('bomber', p.x + 25, p.y);
    bomber.warning = 0;
    g.enemies = [bomber];
    g.updateEnemy(bomber, 0.02);
    assert.equal(bomber.dead, true);
    assert.equal(p.hp, 100 - ENEMIES.bomber.damage);
});

test('超频电池与纳米修复使用正式计时，网络输入不能越界或伪造坐标', () => {
    const g = setup(),
        p = g.players[0];
    p.hp = 50;
    p.regen = 1.5;
    g.pickups = [{ x: p.x, y: p.y, age: 0, life: 2, kind: 'overdrive' }];
    g.updatePickups(0.02);
    assert.equal(p.overdrive, 8);
    g.updatePlayer(p, 1);
    assert.equal(p.hp, 51.5);
    assert.equal(p.overdrive, 7);
    const input = sanitizeInput({ x: 999, y: 999, aim: Infinity, fire: 'yes', hp: 9999 });
    assert.ok(Math.hypot(input.x, input.y) <= 1.00001);
    assert.equal(input.aim, null);
    assert.equal(input.fire, false);
    assert.equal(input.hp, undefined);
    const packet = createSnapshot(g);
    assert.ok(packet.walls.filter((w) => w.steel).every((w) => w.hp > 0));
    assert.equal(packet.controls, undefined);
    assert.equal(packet.commandSender, undefined);
});

test('霜脊首领使用低速冷色扇形弹，熔炉首领追加落点炮击', () => {
    const g = setup();
    g.walls = [];
    const frost = g.makeEnemy('frostBoss', 640, 180);
    frost.warning = 0;
    g.enemies = [frost];
    g.fire(frost, true);
    assert.equal(g.bullets.length, 5);
    assert.ok(g.bullets.every((b) => b.tint === '#b8e9f3' && Math.hypot(b.vx, b.vy) < 240));
    const inferno = g.makeEnemy('infernoBoss', 640, 180);
    inferno.warning = 0;
    inferno.radialCd = 0;
    g.enemies = [inferno];
    g.updateEnemy(inferno, 0.02);
    assert.ok(g.hazards.some((h) => h.enemy));
});
