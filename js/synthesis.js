/** 纯 PCM 合成器：同一份音色供浏览器播放和离线验收，不依赖音频设备或第三方素材。 */
export function synthesizeEffect(kind, sampleRate = 44100) {
    const durations = {
        shoot: 0.55,
        enemy: 0.44,
        hit: 0.25,
        explode: 1.65,
        hurt: 0.48,
        nova: 2.0,
        dash: 0.32,
    };
    const duration = durations[kind] || 0.4;
    const samples = new Float32Array(Math.ceil(duration * sampleRate));
    let seed = 9137,
        low = 0,
        previous = 0,
        phase = 0;
    for (let i = 0; i < samples.length; i++) {
        const t = i / sampleRate;
        // 确定性噪声及低通状态分别提供金属高频、炮口压力和爆炸滚动的低频纹理。
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const noise = seed / 2147483648 - 1;
        const cutoff = kind === 'explode' || kind === 'nova' ? 480 + 1600 * Math.exp(-t * 6) : 1700;
        low += (noise - low) * (1 - Math.exp((-Math.PI * 2 * cutoff) / sampleRate));
        const high = noise - previous;
        previous = noise;
        let value = 0;
        if (kind === 'shoot' || kind === 'enemy') {
            const frequency = 43 + 100 * Math.exp(-t * 35);
            phase += (Math.PI * 2 * frequency) / sampleRate;
            const pressure = Math.sin(phase) * Math.exp(-t * 12) * 0.95;
            const punch = low * Math.exp(-t * 19) * 1.8;
            const crack = high * Math.exp(-t * 145) * 0.8;
            const breech = t > 0.08 ? Math.sin(t * 2150) * Math.exp(-(t - 0.08) * 65) * 0.13 : 0;
            value = pressure + punch + crack + breech;
            if (kind === 'enemy') value *= 0.65;
        } else if (kind === 'explode' || kind === 'nova') {
            phase += (Math.PI * 2 * (29 + 64 * Math.exp(-t * 8))) / sampleRate;
            const body = Math.sin(phase) * Math.exp(-t * 3.8) * 0.95;
            const rolling = low * (0.85 + Math.sin(t * 32) * 0.15) * Math.exp(-t * 3) * 2.6;
            const detonation = high * Math.exp(-t * 85) * 0.65;
            const debris =
                t > 0.1 ? high * Math.exp(-t * 5.5) * (Math.sin(t * 131) > 0.88 ? 0.45 : 0.035) : 0;
            value = body + rolling + detonation + debris;
            if (kind === 'nova')
                value +=
                    Math.sin(2 * Math.PI * (180 * t + 28 * (1 - Math.exp(-t * 8)))) * Math.exp(-t * 4) * 0.28;
        } else if (kind === 'hit') {
            value = high * Math.exp(-t * 100) * 0.8 + low * Math.exp(-t * 32) * 0.7;
            value += (Math.sin(t * 2840) + Math.sin(t * 4270) * 0.4) * Math.exp(-t * 43) * 0.24;
            value += Math.sin(t * 2 * Math.PI * 135) * Math.exp(-t * 30) * 0.45;
        } else if (kind === 'hurt') {
            phase += (Math.PI * 2 * (55 + 140 * Math.exp(-t * 18))) / sampleRate;
            value = Math.sin(phase) * Math.exp(-t * 9) * 0.7 + low * Math.exp(-t * 18) * 1.3;
        } else {
            value =
                low * Math.sin(Math.PI * Math.min(1, t / duration)) * 1.7 +
                Math.sin(t * 1900) * Math.exp(-t * 19) * 0.08;
        }
        // 极短起音和尾部淡出消除硬截断；软饱和保留重量而不产生数字削波。
        const attack = Math.min(1, t / 0.0012),
            tail = Math.min(1, (duration - t) / 0.035);
        samples[i] = Math.tanh(value * 1.25) * attack * tail * 0.92;
    }
    return samples;
}
