import { synthesizeEffect } from './synthesis.js';

/** 分轨音频导演：战斗音色预合成为 PCM，音乐独立混音，保留炮火的动态冲击。 */
export class SoundDirector {
    constructor() {
        try {
            this.enabled = localStorage.getItem('emberline-sound') !== 'off';
        } catch {
            this.enabled = true;
        }
        this.context = null;
        this.step = 0;
        this.nextBeat = 0;
        this.music = false;
        this.intensity = 0;
        this.voices = [];
        this.lastEvents = new Map();
    }
    /** 用户首次点击后解锁音频；不支持音频的浏览器仍能正常游玩。 */
    async unlock() {
        try {
            if (!this.context) {
                this.context = new (window.AudioContext || window.webkitAudioContext)();
                this.master = this.context.createGain();
                this.master.gain.value = this.enabled ? 0.78 : 0;
                this.musicBus = this.context.createGain();
                this.musicBus.gain.value = 0.2;
                this.musicBus.connect(this.master);
                const bass = this.context.createBiquadFilter();
                bass.type = 'lowshelf';
                bass.frequency.value = 110;
                bass.gain.value = 3;
                const compressor = this.context.createDynamicsCompressor();
                compressor.threshold.value = -7;
                compressor.knee.value = 8;
                compressor.ratio.value = 8;
                compressor.attack.value = 0.003;
                compressor.release.value = 0.18;
                this.master.connect(bass);
                bass.connect(compressor);
                compressor.connect(this.context.destination);
                // 短促的室外反射让爆炸有空间尾音；低通回声避免掩盖后续射击。
                this.reflections = this.context.createDelay(0.3);
                this.reflections.delayTime.value = 0.085;
                const reflectionFilter = this.context.createBiquadFilter();
                reflectionFilter.type = 'lowpass';
                reflectionFilter.frequency.value = 1600;
                const reflectionGain = this.context.createGain();
                reflectionGain.gain.value = 0.18;
                this.reflections.connect(reflectionFilter);
                reflectionFilter.connect(reflectionGain);
                reflectionGain.connect(this.master);
                this.effects = new Map();
                for (const event of ['shoot', 'enemy', 'hit', 'explode', 'hurt', 'nova', 'dash']) {
                    const samples = synthesizeEffect(event, this.context.sampleRate);
                    const buffer = this.context.createBuffer(1, samples.length, this.context.sampleRate);
                    buffer.copyToChannel(samples, 0);
                    this.effects.set(event, buffer);
                }
                const size = this.context.sampleRate * 2;
                this.noiseBuffer = this.context.createBuffer(1, size, this.context.sampleRate);
                const samples = this.noiseBuffer.getChannelData(0);
                for (let i = 0; i < size; i++) samples[i] = Math.random() * 2 - 1;
            }
            if (this.context.state === 'suspended') await this.context.resume();
        } catch {
            this.enabled = false;
        }
    }
    /** 持久化静音选择；更改总线增益避免逐音色切换产生爆音。 */
    toggle() {
        this.enabled = !this.enabled;
        try {
            localStorage.setItem('emberline-sound', this.enabled ? 'on' : 'off');
        } catch {
            /* 隐私模式下只保存本次设置。 */
        }
        if (this.context)
            this.master.gain.setTargetAtTime(this.enabled ? 0.78 : 0, this.context.currentTime, 0.03);
        return this.enabled;
    }
    /** 合成带音高滑落的短音，提供炮口低频、反馈音和旋律。 */
    tone(frequency, end, duration, volume, type = 'sine', delay = 0) {
        if (!this.context || !this.enabled) return;
        const time = this.context.currentTime + delay;
        const source = this.context.createOscillator();
        const gain = this.context.createGain();
        source.type = type;
        source.frequency.setValueAtTime(frequency, time);
        source.frequency.exponentialRampToValueAtTime(Math.max(20, end), time + duration);
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        source.connect(gain);
        gain.connect(this.music ? this.musicBus : this.master);
        source.start(time);
        source.stop(time + duration + 0.02);
    }
    /** 经滤波的噪声提供金属撞击、炮火与碎石的瞬态。 */
    noise(duration, volume, frequency, type = 'lowpass') {
        if (!this.context || !this.enabled) return;
        const time = this.context.currentTime;
        const source = this.context.createBufferSource();
        source.buffer = this.noiseBuffer;
        const filter = this.context.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = frequency;
        const gain = this.context.createGain();
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.music ? this.musicBus : this.master);
        source.start(time, Math.random());
        source.stop(time + duration);
    }
    /** 播放缓存音色：声像随战场位置移动，限制并发与同帧重叠，重爆炸让音乐短暂退后。 */
    playEffect(event, options) {
        const now = this.context.currentTime;
        const interval = event === 'hit' ? 0.018 : event === 'enemy' ? 0.055 : 0.03;
        if (now - (this.lastEvents.get(event) ?? -100) < interval) return;
        this.lastEvents.set(event, now);
        if (this.voices.length >= 28) {
            const oldest = this.voices.shift();
            oldest.gain.gain.setTargetAtTime(0, now, 0.008);
            oldest.source.stop(now + 0.035);
        }
        const source = this.context.createBufferSource();
        source.buffer = this.effects.get(event);
        source.playbackRate.value = 0.96 + Math.random() * 0.08;
        const gain = this.context.createGain();
        const levels = { shoot: 0.9, enemy: 0.35, hit: 0.65, explode: 1, hurt: 0.85, nova: 1, dash: 0.55 };
        gain.gain.value = levels[event] * (options.strength || 1);
        const pan = this.context.createStereoPanner();
        pan.pan.value = Math.max(-0.7, Math.min(0.7, ((options.x ?? 640) / 640 - 1) * 0.7));
        source.connect(gain);
        gain.connect(pan);
        pan.connect(this.master);
        if (event === 'explode' || event === 'shoot' || event === 'nova') pan.connect(this.reflections);
        const voice = { source, gain };
        this.voices.push(voice);
        source.onended = () => {
            this.voices = this.voices.filter((item) => item !== voice);
            source.disconnect();
            gain.disconnect();
            pan.disconnect();
        };
        source.start();
        if (event === 'explode' || event === 'nova') {
            this.musicBus.gain.cancelScheduledValues(now);
            this.musicBus.gain.setTargetAtTime(0.055, now, 0.012);
            this.musicBus.gain.setTargetAtTime(0.2, now + 0.3, 0.22);
        }
    }
    /** 事件音色分层：击中清脆、摧毁厚重、技能有清晰的预示和尾音。 */
    play(event, options = {}) {
        if (!this.context || !this.enabled) return;
        if (this.effects.has(event)) {
            this.playEffect(event, options);
            return;
        }
        if (event === 'pickup' || event === 'upgrade')
            [0, 4, 7, 12].forEach((note, i) =>
                this.tone(330 * 2 ** (note / 12), 330 * 2 ** (note / 12), 0.16, 0.11, 'sine', i * 0.07),
            );
        if (event === 'wave')
            [130, 164, 196].forEach((note, i) => this.tone(note, note, 0.6, 0.13, 'triangle', i * 0.14));
        if (event === 'win')
            [0, 4, 7, 12, 7, 12, 16].forEach((note, i) =>
                this.tone(262 * 2 ** (note / 12), 262 * 2 ** (note / 12), 0.5, 0.2, 'triangle', i * 0.17),
            );
        if (event === 'lose')
            [130, 110, 87, 65].forEach((note, i) =>
                this.tone(note, note * 0.8, 0.6, 0.22, 'triangle', i * 0.2),
            );
    }
    /** 用音频时钟推进低调的合成器节拍；暂停后丢弃过期拍点，避免恢复时补播。 */
    update(active, intensity) {
        if (!this.context || !this.enabled) return;
        const time = this.context.currentTime;
        if (!active) {
            this.nextBeat = time;
            return;
        }
        if (time < this.nextBeat) return;
        this.nextBeat = time + 0.19;
        this.music = true;
        const notes = [55, 55, 65.4, 55, 73.4, 55, 65.4, 49];
        if (this.step % 2 === 0)
            this.tone(notes[Math.floor(this.step / 2) % notes.length], 45, 0.17, 0.14, 'triangle');
        if (this.step % 4 === 0) this.tone(100, 30, 0.15, 0.2);
        if (intensity > 0.35 && this.step % 2) this.noise(0.025, 0.035, 6000, 'highpass');
        if (this.step % 8 === 4) this.tone(220 * (this.step % 16 ? 1 : 1.5), 220, 0.6, 0.035, 'sine');
        this.step++;
        this.music = false;
    }
}
