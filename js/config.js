/** 战役配置与实体参数以数据组织，服务器和浏览器共同读取同一套规则。 */
export const WORLD = { width: 1280, height: 800, cell: 40 };
/** 四个战区各六关；战区属性同时驱动碰撞地图、背景材质与房间章节选择。 */
export const ZONES = [
    { name: '灰烬工业区', subtitle: 'ASH DISTRICT', ground: '#343e30', road: '#3b4339', cover: '#6a7057' },
    { name: '霜线中继站', subtitle: 'FROST RELAY', ground: '#344a4d', road: '#46585b', cover: '#798f92' },
    { name: '熔炉禁区', subtitle: 'THE FOUNDRY', ground: '#493b32', road: '#55463c', cover: '#8a7560' },
    // 第四战区：相位裂隙撕开了旧战场，地面泛着冷紫色，敌军会闪烁位移与架盾推进。
    { name: '虚空裂隙', subtitle: 'THE RIFT', ground: '#33324a', road: '#3d3c55', cover: '#77719a' },
];
/** 事件提供不同的战术目标；描述同时出现在任务提示与房间章节介绍中。 */
export const FIELD_EVENTS = {
    supply: { name: '战地补给', description: '维修模块已投放，靠近自动拾取。' },
    overdrive: { name: '超频电池', description: '拾取橙色电池，获得 8 秒双倍射速。' },
    bombardment: { name: '危险炮击', description: '避开红色预警圈，也可将敌军引入轰炸区。' },
    beacon: { name: '信标争夺', description: '在中央信标附近坚守 4 秒，为核心修复并获得奖励。' },
    // 悬赏：本波中途出现一辆金色精英战车，耐久更高，击毁后给予大量积分与全员修复。
    bounty: { name: '悬赏目标', description: '击毁金色精英战车，奖励 1000 积分并全员修复。' },
    // 裂隙门：左右两座相位门互相连通，玩家驶入即可瞬移到另一侧，用于救援核心或甩开追兵。
    rift: { name: '相位裂隙', description: '驶入紫色相位门可瞬移到另一侧，灵活支援两翼。' },
};
export const WAVES = [
    {
        title: '废墟来客',
        subtitle: 'FIRST CONTACT',
        count: 7,
        interval: 1.6,
        types: ['scout', 'scout', 'raider'],
        event: 'supply',
    },
    {
        title: '钢铁洪流',
        subtitle: 'STEEL TIDE',
        count: 11,
        interval: 1.35,
        types: ['scout', 'raider', 'raider'],
        event: 'overdrive',
    },
    {
        title: '远处的猎手',
        subtitle: 'DEADLY HORIZON',
        count: 13,
        interval: 1.4,
        types: ['sniper', 'scout', 'raider'],
        event: 'beacon',
    },
    {
        title: '重装来袭',
        subtitle: 'HEAVY PRESSURE',
        count: 16,
        interval: 1.25,
        types: ['heavy', 'raider', 'sniper'],
        event: 'bombardment',
    },
    {
        title: '自爆车队',
        subtitle: 'SUICIDE CONVOY',
        count: 18,
        interval: 1.1,
        types: ['bomber', 'scout', 'raider'],
        event: 'overdrive',
    },
    {
        title: '灰烬之王',
        subtitle: 'THE ASHEN COLOSSUS',
        count: 12,
        interval: 1.75,
        types: ['heavy', 'raider', 'sniper'],
        boss: 'boss',
        event: 'supply',
    },
    {
        title: '雪线遭遇',
        subtitle: 'WHITE CONTACT',
        count: 14,
        interval: 1.3,
        types: ['scout', 'engineer', 'raider'],
        event: 'beacon',
    },
    {
        title: '远程压制',
        subtitle: 'FALLING STEEL',
        count: 15,
        interval: 1.4,
        types: ['artillery', 'sniper', 'raider'],
        event: 'bombardment',
    },
    {
        title: '裂变车群',
        subtitle: 'FRACTURE SWARM',
        count: 16,
        interval: 1.2,
        types: ['splitter', 'scout', 'bomber'],
        event: 'bounty',
    },
    {
        title: '冰原救援',
        subtitle: 'THE RELAY MUST HOLD',
        count: 18,
        interval: 1.1,
        types: ['engineer', 'heavy', 'raider'],
        event: 'beacon',
    },
    {
        title: '极夜封锁',
        subtitle: 'POLAR SIEGE',
        count: 20,
        interval: 1.1,
        types: ['artillery', 'bomber', 'heavy'],
        event: 'supply',
    },
    {
        title: '霜脊堡垒',
        subtitle: 'FROSTBOUND TITAN',
        count: 14,
        interval: 1.6,
        types: ['heavy', 'engineer', 'sniper'],
        boss: 'frostBoss',
        event: 'overdrive',
    },
    {
        title: '深入熔炉',
        subtitle: 'INTO THE FOUNDRY',
        count: 17,
        interval: 1.15,
        types: ['bomber', 'splitter', 'raider'],
        event: 'bombardment',
    },
    {
        title: '炼狱工兵',
        subtitle: 'REPAIR THE WAR',
        count: 19,
        interval: 1.15,
        types: ['engineer', 'heavy', 'artillery'],
        event: 'beacon',
    },
    {
        title: '爆裂回路',
        subtitle: 'CHAIN REACTION',
        count: 22,
        interval: 0.95,
        types: ['bomber', 'splitter', 'scout'],
        event: 'bounty',
    },
    {
        title: '火雨防线',
        subtitle: 'UNDER THE FIRESTORM',
        count: 20,
        interval: 1.1,
        types: ['artillery', 'sniper', 'heavy'],
        event: 'bombardment',
    },
    {
        title: '黎明之前',
        subtitle: 'ONE LAST STAND',
        count: 24,
        interval: 0.95,
        types: ['splitter', 'engineer', 'bomber', 'heavy'],
        event: 'supply',
    },
    {
        title: '熔炉主宰',
        subtitle: 'HEART OF THE INFERNO',
        count: 16,
        interval: 1.4,
        types: ['heavy', 'artillery', 'engineer'],
        boss: 'infernoBoss',
        event: 'beacon',
    },
    // ---- 第四战区「虚空裂隙」：引入相位幽影、盾卫战车与裂隙主脑 ----
    {
        title: '裂隙初现',
        subtitle: 'FIRST RIFT',
        count: 16,
        interval: 1.2,
        types: ['phantom', 'scout', 'raider'],
        event: 'rift',
    },
    {
        title: '盾墙推进',
        subtitle: 'SHIELD WALL',
        count: 18,
        interval: 1.2,
        types: ['guardian', 'sniper', 'raider'],
        event: 'bounty',
    },
    {
        title: '相位猎杀',
        subtitle: 'PHASE HUNT',
        count: 20,
        interval: 1.05,
        types: ['phantom', 'bomber', 'guardian'],
        event: 'bombardment',
    },
    {
        title: '虚空回廊',
        subtitle: 'HOLLOW CORRIDOR',
        count: 22,
        interval: 1,
        types: ['guardian', 'engineer', 'artillery', 'phantom'],
        event: 'rift',
    },
    {
        title: '最后的微光',
        subtitle: 'LAST LIGHT',
        count: 26,
        interval: 0.9,
        types: ['splitter', 'phantom', 'guardian', 'heavy'],
        event: 'bounty',
    },
    {
        title: '裂隙主脑',
        subtitle: 'THE RIFT MIND',
        count: 18,
        interval: 1.3,
        types: ['guardian', 'phantom', 'artillery'],
        boss: 'riftBoss',
        event: 'supply',
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
    bomber: {
        name: '自爆突击车',
        hp: 32,
        speed: 145,
        cooldown: 10,
        damage: 26,
        range: 65,
        score: 180,
        color: '#e8a56c',
        radius: 15,
    },
    engineer: {
        name: '战地工兵',
        hp: 95,
        speed: 58,
        cooldown: 2.8,
        damage: 6,
        range: 340,
        score: 260,
        color: '#b3be8d',
        radius: 19,
    },
    artillery: {
        name: '自行火炮',
        hp: 100,
        speed: 38,
        cooldown: 4.2,
        damage: 24,
        range: 650,
        score: 300,
        color: '#b7a596',
        radius: 23,
    },
    splitter: {
        name: '裂变母车',
        hp: 150,
        speed: 53,
        cooldown: 2.1,
        damage: 10,
        range: 280,
        score: 320,
        color: '#bfa078',
        radius: 24,
    },
    // 盾卫战车：车头装有相位护盾，正面命中只造成 25% 伤害，鼓励绕侧或用震荡与炮击破防。
    guardian: {
        name: '盾卫战车',
        hp: 125,
        speed: 50,
        cooldown: 2.3,
        damage: 11,
        range: 300,
        score: 280,
        color: '#9fa7c9',
        radius: 21,
        shield: true,
    },
    // 相位幽影：每隔数秒向目标方向闪烁一段距离，不能靠掩体长期卡位。
    phantom: {
        name: '相位幽影',
        hp: 58,
        speed: 82,
        cooldown: 1.9,
        damage: 11,
        range: 300,
        score: 240,
        color: '#b49be0',
        radius: 17,
        blink: true,
    },
    frostBoss: {
        name: '霜脊堡垒',
        hp: 2100,
        speed: 34,
        cooldown: 1.5,
        damage: 15,
        range: 570,
        score: 3500,
        color: '#a6cbd0',
        radius: 43,
        boss: true,
    },
    infernoBoss: {
        name: '熔炉主宰',
        hp: 2500,
        speed: 38,
        cooldown: 1.3,
        damage: 16,
        range: 590,
        score: 5000,
        color: '#ef9a62',
        radius: 45,
        boss: true,
    },
    // 裂隙主脑：最终首领，周期性瞬移并召唤相位幽影，半血后弹幕变为双层螺旋。
    riftBoss: {
        name: '裂隙主脑',
        hp: 2900,
        speed: 36,
        cooldown: 1.3,
        damage: 16,
        range: 600,
        score: 7000,
        color: '#c3a4f2',
        radius: 45,
        boss: true,
    },
    boss: {
        boss: true,
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
        id: 'sentry',
        name: '自动哨戒系统',
        text: '炮台伤害提高 40%，部署冷却缩短 20%。',
        icon: 'core',
        apply: (p) => {
            p.supportDamage *= 1.4;
            p.supportMax *= 0.8;
        },
    },
    {
        id: 'regen',
        name: '纳米修复层',
        text: '持续修复每秒 1.5 装甲，积少成多。',
        icon: 'shield',
        max: 3,
        apply: (p) => {
            p.regen += 1.5;
        },
    },
    {
        id: 'battery',
        name: '战术能量回路',
        text: '冲刺与震荡冷却各缩短 15%，维修拾取额外恢复 10 装甲。',
        icon: 'rapid',
        apply: (p) => {
            p.dashMax *= 0.85;
            p.novaMax *= 0.85;
            p.repairBonus += 10;
        },
    },
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
    {
        // 跳弹：命中掩体后反弹一次而不是消失，可以打到掩体后面的敌人。
        id: 'ricochet',
        name: '跳弹偏转器',
        text: '炮弹撞墙后反弹一次，绕过掩体打击敌人。',
        icon: 'spread',
        max: 2,
        apply: (p) => {
            p.bounce += 1;
        },
    },
    {
        // 吸能：每次击毁敌军，全体存活队员回复少量装甲，鼓励主动进攻。
        id: 'vampire',
        name: '残骸吸能装置',
        text: '每击毁一辆敌军，全员回复 4 点装甲。',
        icon: 'shield',
        max: 2,
        apply: (p) => {
            p.lifesteal += 4;
        },
    },
    {
        // 殉爆：被击毁的敌军原地爆炸，波及周围敌军，可触发连锁反应。
        id: 'chain',
        name: '殉爆诱导弹',
        text: '敌军被击毁时发生殉爆，对周围敌军造成 45 伤害。',
        icon: 'nova',
        max: 1,
        apply: (p) => {
            p.chain = true;
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
