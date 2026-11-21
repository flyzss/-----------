/** 服务器内部字段或纯装饰字段，不进入网络快照。 */
const SKIPPED_KEYS = new Set(['path', 'pathCd', 'hitIds', 'seed', 'blinkCd', 'healCd', 'targetCore']);
/** 联机快照只传渲染与界面所需状态；规则、碰撞和随机数留在服务器执行。 */
export function createSnapshot(game) {
    const fields = [
        'state',
        'mode',
        'chapter',
        'time',
        'wave',
        'zone',
        'score',
        'kills',
        'combo',
        'comboTime',
        'core',
        'players',
        'enemies',
        'bullets',
        'walls',
        'rings',
        'texts',
        'pickups',
        'wrecks',
        'impacts',
        'camera',
        'shake',
        'flash',
        'whiteFlash',
        'turrets',
        'hazards',
        'beacon',
        'portals',
        'upgrades',
        'spawned',
        'best',
    ];
    const result = {};
    for (const key of fields) result[key] = game[key];
    result.choices = (game.choices || []).map((choice) => choice.id);
    // 省略只供服务器使用的寻路、穿透集合与掩体噪声种子；粒子改由客户端按 bursts 参数本地生成。
    // 数值保留两位小数：逻辑坐标以像素计，0.01 像素与 0.01 弧度的误差肉眼不可见，却能明显缩小快照。
    return JSON.parse(
        JSON.stringify(result, (key, value) => {
            if (SKIPPED_KEYS.has(key)) return undefined;
            if (typeof value === 'number')
                return Number.isFinite(value) ? Math.round(value * 100) / 100 : 1e9;
            return value;
        }),
    );
}
/** 只接收有限范围的操作数据，不接收客户端位置、血量、积分或伤害。 */
export function sanitizeInput(value = {}) {
    const number = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    let x = Math.max(-1, Math.min(1, number(value.x))),
        y = Math.max(-1, Math.min(1, number(value.y)));
    const length = Math.hypot(x, y);
    if (length > 1) {
        x /= length;
        y /= length;
    }
    return {
        x,
        y,
        fire: value.fire === true,
        aim:
            typeof value.aim === 'number' && Number.isFinite(value.aim)
                ? Math.atan2(Math.sin(value.aim), Math.cos(value.aim))
                : null,
    };
}
