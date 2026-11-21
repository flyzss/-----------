/** 战役配置：六波战斗逐步引入新敌人，第六波为首领决战。 */
export const WORLD = { width: 1280, height: 800, cell: 40 };
export const WAVES = [
    {
        title: '废墟来客',
        subtitle: 'FIRST CONTACT',
        count: 7,
        interval: 1.6,
        types: ['scout', 'scout', 'raider'],
    },
    {
        title: '钢铁洪流',
        subtitle: 'STEEL TIDE',
        count: 11,
        interval: 1.35,
        types: ['scout', 'raider', 'raider'],
    },
    {
        title: '远处的猎手',
        subtitle: 'DEADLY HORIZON',
        count: 13,
        interval: 1.4,
        types: ['sniper', 'scout', 'raider'],
    },
    {
        title: '重装来袭',
        subtitle: 'HEAVY PRESSURE',
        count: 16,
        interval: 1.25,
        types: ['heavy', 'raider', 'sniper'],
    },
    {
        title: '最后的长夜',
        subtitle: 'BEFORE THE DAWN',
        count: 19,
        interval: 1.1,
        types: ['scout', 'heavy', 'raider', 'sniper'],
    },
    {
        title: '灰烬之王',
        subtitle: 'THE ASHEN COLOSSUS',
        count: 12,
        interval: 1.75,
        types: ['heavy', 'raider', 'sniper'],
        boss: true,
    },
];
/** 不同敌人拥有独立的速度、装甲、交战距离和火力节奏。 */
export const ENEMIES = {
    scout: {
        name: '掠袭者',
        hp: 38,
        speed: 100,
        cooldown: 1.8,
        damage: 7,
        range: 230,
        score: 100,
        color: '#d5a15e',
        radius: 16,
    },
    raider: {
        name: '突击战车',
        hp: 70,
        speed: 65,
        cooldown: 2,
        damage: 10,
        range: 320,
        score: 160,
        color: '#cc7853',
        radius: 19,
    },
    sniper: {
        name: '远射猎手',
        hp: 50,
        speed: 48,
        cooldown: 3,
        damage: 17,
        range: 530,
        score: 220,
        color: '#b78b77',
        radius: 17,
    },
    heavy: {
        name: '重装堡垒',
        hp: 165,
        speed: 40,
        cooldown: 2.4,
        damage: 13,
        range: 350,
        score: 300,
        color: '#9b8c63',
        radius: 24,
    },
    boss: {
        name: '灰烬之王',
        hp: 1750,
        speed: 31,
        cooldown: 1.6,
        damage: 12,
        range: 560,
        score: 2500,
        color: '#dc8b58',
        radius: 43,
    },
};
/** 升级池：每波抽取三种不同改装，效果同时作用于所有存活及复活后的玩家。 */
export const UPGRADES = [
    {
        id: 'damage',
        name: '钨芯穿甲弹',
        text: '主炮伤害提高 30%，正面击穿重装防线。',
        icon: 'shell',
        apply: (p) => {
            p.damage *= 1.3;
        },
    },
    {
        id: 'rapid',
        name: '高速装填机',
        text: '主炮射速提高 22%，持续压制来袭敌军。',
        icon: 'rapid',
        apply: (p) => {
            p.fireRate = Math.max(0.085, p.fireRate * 0.78);
        },
    },
    {
        id: 'spread',
        name: '双联散射炮',
        text: '额外发射一枚散射弹，扩大火力覆盖。',
        icon: 'spread',
        max: 2,
        apply: (p) => {
            p.multishot += 1;
        },
    },
    {
        id: 'armor',
        name: '复合反应装甲',
        text: '装甲上限增加 35，立即修复全部装甲。',
        icon: 'shield',
        apply: (p) => {
            p.maxHp += 35;
            p.hp = p.maxHp;
        },
    },
    {
        id: 'speed',
        name: '超频涡轮',
        text: '移动速度提高 15%，冲刺冷却缩短 15%。',
        icon: 'speed',
        apply: (p) => {
            p.speed *= 1.15;
            p.dashMax *= 0.85;
        },
    },
    {
        id: 'nova',
        name: '震荡放大器',
        text: '震荡伤害提高 45%，冷却缩短 20%。',
        icon: 'nova',
        apply: (p) => {
            p.novaDamage *= 1.45;
            p.novaMax *= 0.8;
        },
    },
    {
        id: 'repair',
        name: '核心修复协议',
        text: '修复核心 30% 耐久，同时全员恢复装甲。',
        icon: 'core',
        apply: (p) => {
            p.hp = p.maxHp;
        },
    },
    {
        id: 'pierce',
        name: '贯穿弹头',
        text: '炮弹额外穿透一个目标，弹速提高 10%。',
        icon: 'shell',
        max: 2,
        apply: (p) => {
            p.pierce += 1;
            p.bulletSpeed *= 1.1;
        },
    },
];
/** 改装图标使用统一描边的 SVG，而不是依赖表情符号字体。 */
export function iconSvg(kind) {
    const paths = {
        shell: '<path d="m12 3 4 6v10H8V9Z M8 14h8 M9 22h6"/>',
        rapid: '<path d="m13 2-8 12h6l-1 8 9-13h-7Z"/>',
        spread: '<path d="M12 21V6 M4 16V7 M20 16V7 M9 9l3-4 3 4 M1 10l3-4 3 4 M17 10l3-4 3 4"/>',
        shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z M8 12l3 3 5-6"/>',
        speed: '<path d="m5 5 7 7-7 7 M13 5l7 7-7 7"/>',
        nova: '<circle cx="12" cy="12" r="4"/><path d="M12 1v4 M12 19v4 M1 12h4 M19 12h4 M4 4l3 3 M17 17l3 3 M4 20l3-3 M17 7l3-3"/>',
        core: '<path d="m12 2 8 10-8 10-8-10Z M12 7v10 M7 12h10"/>',
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[kind] || paths.shell}</svg>`;
}
