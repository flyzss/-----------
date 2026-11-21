import test from 'node:test';
import assert from 'node:assert/strict';
import { synthesizeEffect } from '../js/synthesis.js';

/** 离线检查正式音色的数值稳定性与低频存在，不用数值测试冒充真人听感评价。 */
test('所有战斗音色有实际声能且不产生 NaN、削波或硬截断', () => {
    for (const kind of ['shoot', 'enemy', 'hit', 'explode', 'hurt', 'nova', 'dash']) {
        const samples = synthesizeEffect(kind, 24000);
        assert.ok(samples.length > 2000);
        let energy = 0,
            peak = 0;
        for (const value of samples) {
            assert.ok(Number.isFinite(value));
            energy += value * value;
            peak = Math.max(peak, Math.abs(value));
        }
        assert.ok(Math.sqrt(energy / samples.length) > 0.015, kind);
        assert.ok(peak < 1, kind);
        assert.equal(samples[0], 0);
        assert.ok(Math.abs(samples.at(-1)) < 0.002, kind);
    }
});

test('炮火与爆炸包含可测量的低频压力，且拥有不同的持续时间', () => {
    const shot = synthesizeEffect('shoot', 24000),
        explosion = synthesizeEffect('explode', 24000);
    assert.ok(explosion.length > shot.length * 2);
    for (const samples of [shot, explosion]) {
        let low = 0,
            energy = 0;
        for (const value of samples) {
            low += 0.025 * (value - low);
            energy += low * low;
        }
        assert.ok(Math.sqrt(energy / samples.length) > 0.025);
    }
});
