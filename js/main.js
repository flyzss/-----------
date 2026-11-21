import { Game, clamp } from './game.js';
import { OnlineSession } from './network.js';
import { appUrl } from './paths.js';
import { Renderer } from './renderer.js';
import { SoundDirector } from './sound.js';
import { WAVES, UPGRADES, ZONES, FIELD_EVENTS, iconSvg } from './config.js';

/** 应用入口只负责输入与界面，战斗规则和绘图分别在独立模块内。 */
const $ = (id) => document.getElementById(id);
const canvas = $('game'),
    layer = $('modal-layer'),
    sound = new SoundDirector();
let mode = 1,
    bannerTimer = 0,
    toastTimer = 0,
    lastFocus = null,
    helpPrevious = null;
const game = new Game(sound, handleEvent);
/** 是否为以触摸为主的设备（手机、平板），用于默认开启自动开火与降低特效密度。 */
const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
const online = new OnlineSession(game, sound, handleOnlineEvent);
let inviteBase = location.origin;
const renderer = new Renderer(canvas, $('radar'), game);
const waveSegments = [];
for (let i = 0; i < WAVES.length; i++) {
    const node = document.createElement('span');
    $('wave-track').append(node);
    waveSegments.push(node);
}

/** 时间格式只显示有效比赛时间，暂停与改装耗时不计入战绩。 */
function formatTime(seconds) {
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
/** 模态打开时移动焦点；关闭后恢复先前焦点，键盘玩家不会落到背景操作上。 */
function showModal(html) {
    if (layer.hidden) lastFocus = document.activeElement;
    layer.innerHTML = `<div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">${html}</div>`;
    layer.hidden = false;
    layer.querySelector('button')?.focus({ preventScroll: true });
}
/** 清空模态内容，避免旧按钮的事件在下次打开时意外复用。 */
function hideModal() {
    layer.hidden = true;
    layer.innerHTML = '';
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
}
/** 消息提示覆盖前一条短提示，保证重复拾取不会积累无穷个计时器。 */
function toast(text) {
    clearTimeout(toastTimer);
    $('toast').textContent = text;
    $('toast').classList.add('show');
    toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2600);
}
/** 音频状态与按钮始终一致，即使浏览器拒绝音频初始化也能清晰反馈。 */
function updateSoundButton() {
    $('sound-button').setAttribute('aria-pressed', String(sound.enabled));
    $('sound-button').querySelector('span').textContent = sound.enabled ? '声音开启' : '声音关闭';
}
/** 开局由真实用户点击解锁音频，同时撤下介绍层。 */
async function startGame() {
    if (online.active) {
        online.send({ type: 'start' });
        return;
    }
    hideModal();
    helpPrevious = null;
    clearTimeout(bannerTimer);
    $('welcome').hidden = true;
    await sound.unlock();
    updateSoundButton();
    game.start(mode, Number($('chapter-select').value));
    document.body.classList.add('playing');
    $('pause-button').disabled = false;
    canvas.style.cursor = 'crosshair';
    updateHud();
}
/** 回主菜单保留本机设置并重新生成演示战场，不刷新或跳转页面。 */
function returnToMenu() {
    if (online.active) online.leave();
    $('room-button').hidden = true;
    hideModal();
    game.mode = mode;
    game.reset();
    game.state = 'menu';
    game.enemies = [
        game.makeEnemy('raider', 940, 240),
        game.makeEnemy('heavy', 1090, 390),
        game.makeEnemy('scout', 850, 115),
    ];
    $('welcome').hidden = false;
    document.body.classList.remove('playing');
    $('pause-button').disabled = true;
    canvas.style.cursor = '';
    clearTimeout(bannerTimer);
    $('banner').classList.remove('show');
    $('banner').textContent = '';
    updateLoadout();
    updateHud();
}
/** 暂停可继续、重开或返回菜单，重开使用当前选择的人数。 */
function showPause() {
    if (online.active) {
        const connected = online.room?.players.every((p) => p.connected);
        showModal(
            `<h2 id="modal-title">协同行动已暂停</h2><p id="network-reason">${online.room?.pauseReason || '两位指挥官共享暂停状态，准备好后继续。'}</p><button class="primary-button" id="resume-button" ${connected ? '' : 'disabled'}>继续协同作战</button><button class="secondary-button" id="leave-room-button">离开房间</button>`,
        );
        $('resume-button').onclick = () => game.resume();
        $('leave-room-button').onclick = returnToMenu;
        return;
    }
    showModal(
        '<h2 id="modal-title">引擎暂歇。</h2><p>防线仍在。准备好，就重返战场。</p><button class="primary-button" id="resume-button">继续战斗 <span>ESC</span></button><button class="secondary-button" id="restart-button">重新部署</button> <button class="secondary-button" id="menu-button">返回主菜单</button>',
    );
    $('resume-button').onclick = () => game.resume();
    $('restart-button').onclick = startGame;
    $('menu-button').onclick = returnToMenu;
}
/** 操作说明覆盖所有设备、双人绑定、复活代价和胜利条件。 */
function showHelp() {
    if (helpPrevious !== null) return;
    helpPrevious = game.state;
    if (game.state === 'playing') game.pause();
    showModal(
        `<h2 id="modal-title">战地手册</h2><p>守住下方水晶核心，穿越四个战区完成二十四波防守。维修、护盾、超频模块靠近自动拾取。</p><div class="help-grid"><div><h3>玩家 1 · 游隼</h3><p><kbd>W A S D</kbd> 移动 / 鼠标瞄准<br><kbd>左键 / SPACE</kbd> 按住开火<br><kbd>SHIFT</kbd> 无敌冲刺 · 冷却 2.8 秒<br><kbd>Q</kbd> 震荡清弹 · 冷却 12 秒<br><kbd>F</kbd> 切换自动开火<br><kbd>E</kbd> 部署哨戒炮（持续 12 秒）</p></div><div><h3>玩家 2 · 雨燕（同屏）</h3><p><kbd>方向键</kbd> 移动 / 自动瞄准<br><kbd>NUM 0 / ENTER</kbd> 按住开火<br><kbd>NUM 1 / 右 SHIFT</kbd> 冲刺<br><kbd>NUM 2 / 右 CTRL</kbd> 震荡<br><kbd>NUM 3 / ?</kbd> 哨戒炮<br><kbd>ESC / P</kbd> 暂停 · <kbd>M</kbd> 声音</p></div></div><p>阵亡后 7 秒重建，消耗核心 40 耐久；全员阵亡且核心不足时行动失败。<br>清波修复全员 35 装甲、核心 15 耐久；改装对全队生效。<br>金色「悬赏」战车击毁奖励 1000 积分；盾卫战车正面有护盾，请绕侧攻击；紫色相位门可瞬移；连击 5 / 10 触发全员超频。<br>联机：两人各用 WASD / 鼠标操控自己的战车，改装投票不同时采用房主选择。<br>触屏：左侧摇杆移动，右侧按钮开火与释放技能，自动瞄准最近敌军。</p><button id="help-close" class="primary-button">了解，返回</button>`,
    );
    $('help-close').onclick = closeHelp;
}
/** 说明退出后恢复原来的暂停、改装或菜单状态，避免绕过升级选择。 */
function closeHelp() {
    const previous = helpPrevious;
    helpPrevious = null;
    hideModal();
    if (previous === 'playing') game.resume();
    else if (previous === 'paused') showPause();
    else if (online.active && online.room?.phase === 'lobby') showLobby(online.room);
    else if (previous === 'upgrade') showUpgrades(game.choices);
    else if (previous === 'won' || previous === 'lost')
        showResult({
            win: previous === 'won',
            score: game.score,
            kills: game.kills,
            time: game.time,
            best: game.best,
        });
}
/** 三选一使用真实按钮；数字键 1–3 也可快速选择。 */
function showUpgrades(choices) {
    showModal(
        `<h2 id="modal-title">防线稳固。重构火力。</h2><p>第 ${game.wave} 波已肃清 · 全员修复 +35 · 核心修复 +15<br>选择一项改装，效果作用于全队。</p>${online.active ? '<p id="vote-status">两位指挥官各选一项，等待全员投票后出击。</p>' : ''}<div class="upgrade-options">${choices.map((u, i) => `<button class="upgrade-option" data-upgrade="${u.id}">${iconSvg(u.icon)}<b>${u.name}</b><p>${u.text}</p><small>[ ${i + 1} ] 选择改装</small></button>`).join('')}</div>`,
    );
    layer
        .querySelectorAll('[data-upgrade]')
        .forEach((button) => (button.onclick = () => game.chooseUpgrade(button.dataset.upgrade)));
}
/** 结算同时呈现本局与本机最高分，提供明确的重玩和退出路径。 */
function showResult(result) {
    document.body.classList.remove('playing');
    $('pause-button').disabled = true;
    showModal(
        `<h2 id="modal-title">${result.win ? '长夜已尽。核心仍亮。' : '防线失守。余烬未熄。'}</h2><p>${result.win ? '二十四道防线，全部守住。裂隙闭合，这座废墟迎来了新的黎明。' : '每一次出击，都更接近黎明。换一种改装，再试一次。'}</p><div class="result-stats"><div><b>${result.score}</b><span>作战积分</span></div><div><b>${result.kills}</b><span>摧毁敌军</span></div><div><b>${formatTime(result.time)}</b><span>行动用时</span></div></div><p>本机最佳 ${result.best} · ${online.active ? '联机合作' : mode === 2 ? '同屏双人' : '单人行动'}</p><button class="primary-button" id="again-button">再度出击 <span>→</span></button><button class="secondary-button" id="result-menu">返回主菜单</button>`,
    );
    $('again-button').onclick = startGame;
    if (online.active && online.slot !== 1) {
        $('again-button').disabled = true;
        $('again-button').textContent = '等待房主再度出击';
    }
    $('result-menu').onclick = returnToMenu;
}
/** 模拟层通过事件通知界面，避免游戏规则直接依赖具体 DOM 结构。 */
function handleEvent(event, data) {
    if (event === 'wave') {
        clearTimeout(bannerTimer);
        $('banner').innerHTML =
            `${data.title}<small>WAVE ${String(game.wave).padStart(2, '0')} / ${data.subtitle}</small>`;
        $('banner').classList.add('show');
        bannerTimer = setTimeout(() => $('banner').classList.remove('show'), 3000);
    }
    if (event === 'pause') {
        game.clearInput();
        if (helpPrevious === null) showPause();
    }
    if (event === 'resume' || event === 'upgraded' || event === 'start') hideModal();
    if (event === 'upgrade') showUpgrades(data);
    if (event === 'upgraded') {
        updateLoadout();
        toast(`已装配：${data.name}`);
    }
    if (event === 'start') {
        activateOnlineBattle();
        updateLoadout();
    }
    if (event === 'field') toast(`${data.name} · ${data.description}`);
    if (event === 'toast') toast(data);
    if (event === 'finish') showResult(data);
}
/** 改装栏合并同类堆叠并保留名称，不用抽象图标替代实际效果说明。 */
function updateLoadout() {
    $('upgrade-count').textContent = `${game.upgrades.length} 项`;
    const counts = new Map();
    game.upgrades.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
    $('loadout').innerHTML = counts.size
        ? [...counts]
              .map(
                  ([id, count]) =>
                      `<div class="loadout-item"><span>${UPGRADES.find((u) => u.id === id).name}</span><b>×${count}</b></div>`,
              )
              .join('')
        : '<p class="empty-loadout">完成一波防守，选择战场升级。</p>';
}
/** 遥测栏低频更新文本；核心、装甲和技能状态都从同一局数据读取。 */
function updateHud() {
    $('landscape-pause').disabled = game.state !== 'playing';
    const p =
            game.players.find((player) => player.id === (online.active ? online.slot : 1)) || game.players[0],
        corePercent = Math.ceil((game.core.hp / game.core.maxHp) * 100);
    $('mission-label').textContent = ZONES[game.zone || 0].name;
    const config = WAVES[Math.max(0, game.wave - 1)],
        field = FIELD_EVENTS[config.event];
    $('objective').textContent =
        game.state === 'menu'
            ? '穿越四个战区，完成二十四道防线。'
            : game.beacon?.done
              ? '信标已接管，继续守住核心。'
              : `${field.name}：${field.description}`;
    $('timer').textContent = formatTime(game.time);
    $('wave-value').textContent = String(game.wave).padStart(2, '0');
    $('kills-value').textContent = String(game.kills).padStart(3, '0');
    $('score-value').textContent = String(game.score).padStart(5, '0');
    $('core-value').textContent = `${corePercent}%`;
    $('core-meter').style.width = `${corePercent}%`;
    $('core-meter').style.background = corePercent < 30 ? 'var(--red)' : 'var(--green)';
    $('core-hint').innerHTML =
        `<i class="status-dot"></i> ${corePercent < 30 ? '核心危急 · 优先清理近处敌军' : '核心信号稳定'}`;
    $('armor-value').textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    $('armor-meter').style.width = `${(p.hp / p.maxHp) * 100}%`;
    $('armor-meter').style.background = p.hp < p.maxHp * 0.3 ? 'var(--red)' : 'var(--green)';
    $('dash-status').textContent = p.dashCd > 0 ? `${p.dashCd.toFixed(1)}s` : '就绪';
    $('nova-status').textContent = p.novaCd > 0 ? `${p.novaCd.toFixed(1)}s` : '就绪';
    $('support-status').textContent = p.supportCd > 0 ? `${p.supportCd.toFixed(1)}s` : '就绪';
    document.querySelector('.pilot-id b').textContent =
        p.id === 2 ? '雨燕 · 协同突击战车' : '游隼 · 轻型突击战车';
    document.querySelector('.pilot-mark').textContent = `P${online.active ? online.slot : 1}`;
    const ally = game.players.find((player) => player.id !== p.id);
    const status =
        game.state === 'menu'
            ? '引擎就绪 / 等待部署'
            : p.hp <= 0
              ? `装甲重建中 · ${Math.max(0, Math.ceil(7 - p.deadTime))} 秒`
              : online.active
                ? `联机 P${online.slot} · 队友装甲 ${Math.ceil(ally?.hp || 0)} · ${online.latency}ms`
                : mode === 2
                  ? `P2 雨燕 · 装甲 ${Math.ceil(game.players[1]?.hp || 0)} / ${game.players[1]?.maxHp || 100}`
                  : '游隼在线 / 炮口已校准';
    $('pilot-status').textContent = status;
    $('combat-state').textContent =
        game.state === 'menu'
            ? '待命 · 等待指挥官'
            : game.state === 'paused'
              ? '行动暂停'
              : game.state === 'upgrade'
                ? '防线肃清 · 战场补给'
                : game.state === 'won'
                  ? '行动成功 · 全线稳固'
                  : game.state === 'lost'
                    ? '信号丢失 · 防线失守'
                    : `第 ${game.wave} 波 · 剩余敌军 ${game.enemies.length + Math.max(0, WAVES[game.wave - 1].count - game.spawned)}`;
    $('sector-label').textContent =
        `SECTOR ${String(Math.max(1, game.wave)).padStart(2, '0')} — ${String(WAVES.length).padStart(2, '0')}`;
    $('auto-label').textContent = game.autoFire ? '开' : '关';
    waveSegments.forEach((node, i) => {
        node.className =
            i < game.wave - 1 || game.state === 'won' ? 'done' : i === game.wave - 1 ? 'active' : '';
    });
}

/** 进入或重连一场服务器战斗时只切换界面，不重新初始化服务器已保存的实体。 */
function activateOnlineBattle() {
    if (!online.active) return;
    $('welcome').hidden = true;
    document.body.classList.add('playing');
    $('pause-button').disabled = false;
    $('room-button').hidden = false;
    canvas.style.cursor = 'crosshair';
}
/** 联机入口给出创建与加入两条明确路径，章节沿用当前选择。 */
function showOnlineMenu(error = '') {
    showModal(
        `<h2 id="modal-title">一起守住这道防线。</h2><p>两位指挥官，各自驾驶战车，共享核心与战场。<br>同一网络或同一个公开游戏网址即可组队。</p><div class="online-form"><button id="create-room" class="primary-button">创建房间 · ${ZONES[Number($('chapter-select').value)].name}</button><div class="join-room"><label for="room-code-input">已有房间码</label><input id="room-code-input" maxlength="6" autocomplete="off" placeholder="6 位房间码" value="${(new URLSearchParams(location.search).get('room') || '').replace(/[^A-Z2-9]/gi, '').slice(0, 6)}"><button id="join-room" class="secondary-button">加入房间</button></div><p id="room-error" class="room-error" role="status"></p></div><button id="online-back" class="secondary-button">返回</button>`,
    );
    $('room-error').textContent = error;
    $('create-room').onclick = () =>
        connectRoom({ type: 'create', chapter: Number($('chapter-select').value) });
    $('join-room').onclick = () => {
        const code = $('room-code-input').value.trim().toUpperCase();
        if (!/^[A-Z2-9]{6}$/.test(code)) {
            $('room-error').textContent = '请输入完整的 6 位房间码';
            return;
        }
        connectRoom({ type: 'join', code });
    };
    $('room-code-input').onkeydown = (event) => {
        if (event.code === 'Enter') {
            $('join-room').click();
            event.stopPropagation();
        }
    };
    $('online-back').onclick = () => {
        online.cleanup();
        hideModal();
    };
}
/** 连接前检查当前入口，失败时保留单人模式并提供联机服务器的可恢复说明。 */
async function connectRoom(request) {
    for (const button of layer.querySelectorAll('button')) button.disabled = true;
    try {
        const response = await fetch(appUrl('api/health'));
        if (!response.ok) throw new Error('当前游戏入口未连接联机服务，请联系房主确认完整网址。');
        const health = await response.json();
        if (!response.ok || health.game !== 'emberline')
            throw new Error('当前网址未连接到余烬防线的联机服务，请确认完整游戏入口。');
        // 公网页面以浏览器实际来源为准，避免 FRP 或外层 HTTPS 终止造成邀请地址降级。
        const localEntry = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
        inviteBase = localEntry ? health.joinBase || location.origin : location.origin;
        await sound.unlock();
        updateSoundButton();
        await online.open(request);
    } catch (error) {
        showOnlineMenu(error.message || '联机连接失败，请检查服务器入口');
    }
}
/** 房间面板只使用服务端认证后的席位与准备状态，不在本机假造“队友已加入”。 */
function showLobby(room) {
    const me = room.players.find((p) => p.slot === online.slot),
        ready = room.players.length === 2 && room.players.every((p) => p.connected && p.ready);
    const invite = appUrl('index.htm', inviteBase);
    invite.searchParams.set('room', room.code);
    showModal(
        `<h2 id="modal-title">房间 ${room.code}</h2><p>${ZONES[room.chapter].name} · P${online.slot} 指挥官<br>复制邀请给队友，两人准备后由房主启动。</p><div class="room-members">${[
            1, 2,
        ]
            .map((slot) => {
                const p = room.players.find((member) => member.slot === slot);
                return `<div><b>P${slot} ${slot === 1 ? '游隼 / 房主' : '雨燕 / 队友'}</b><span>${!p ? '等待加入' : !p.connected ? '等待重连' : p.ready ? '已准备' : '尚未准备'}</span></div>`;
            })
            .join(
                '',
            )}</div><div class="invite-row"><input id="room-invite" aria-label="邀请链接" readonly><button id="copy-invite" class="secondary-button">复制邀请</button></div><div class="room-actions"><button id="ready-room" class="primary-button">${me?.ready ? '取消准备' : '我已准备'}</button>${online.slot === 1 ? `<button id="launch-room" class="primary-button" ${ready ? '' : 'disabled'}>两人出击</button>` : '<p>等待房主启动行动。</p>'}</div><button id="leave-lobby" class="secondary-button">离开房间</button>`,
    );
    $('room-invite').value = invite.href;
    $('ready-room').onclick = async () => {
        await sound.unlock();
        updateSoundButton();
        online.send({ type: 'ready', ready: !me?.ready });
    };
    if ($('launch-room')) $('launch-room').onclick = () => online.send({ type: 'start' });
    $('copy-invite').onclick = async () => {
        try {
            await navigator.clipboard.writeText(invite.href);
            toast('邀请链接已复制');
        } catch {
            $('room-invite').select();
            toast('请手动复制选中的邀请链接');
        }
    };
    $('leave-lobby').onclick = returnToMenu;
}
/** 网络生命周期与模拟事件分开处理，重连和刷新直接恢复当前暂停、改装或结算。 */
function handleOnlineEvent(event, data) {
    if (event === 'room') {
        $('room-button').hidden = false;
        $('room-button').querySelector('span').textContent = `房间 ${data.code}`;
        if (data.phase === 'lobby') showLobby(data);
        if ($('vote-status'))
            $('vote-status').textContent =
                `已投票 ${Object.keys(data.votes).length} / 2${data.votes[online.slot] ? ' · 你的选择已提交' : ''}`;
        if ($('network-reason'))
            $('network-reason').textContent = data.pauseReason || '两位指挥官共享暂停状态，准备好后继续。';
        return;
    }
    if (event === 'connection') {
        showModal(
            `<h2 id="modal-title">正在恢复通信</h2><p>${data}</p><button id="reconnect-leave" class="secondary-button">离开房间</button>`,
        );
        $('reconnect-leave').onclick = returnToMenu;
        return;
    }
    if (event === 'closed') {
        returnToMenu();
        toast(data);
        return;
    }
    if (event === 'error') {
        toast(data);
        return;
    }
    if (event === 'sync') {
        activateOnlineBattle();
        updateLoadout();
        if (game.state === 'paused') showPause();
        else if (game.state === 'upgrade') showUpgrades(game.choices);
        else if (['won', 'lost'].includes(game.state))
            showResult({
                win: game.state === 'won',
                score: game.score,
                kills: game.kills,
                time: game.time,
                best: game.best || game.score,
            });
        else hideModal();
        return;
    }
    handleEvent(event, data);
}
/** 菜单模式切换不启动游戏，按钮的选中状态也提供给辅助技术。 */
document.querySelectorAll('[data-mode]').forEach(
    (button) =>
        (button.onclick = () => {
            mode = Number(button.dataset.mode);
            document.querySelectorAll('[data-mode]').forEach((node) => {
                node.classList.toggle('selected', node === button);
                node.setAttribute('aria-pressed', String(node === button));
            });
            toast(
                mode === 2
                    ? '双人协作：P2 使用方向键与数字小键盘，完整按键见操作说明'
                    : '单人行动：WASD 移动，鼠标瞄准',
            );
        }),
);
$('start-button').onclick = startGame;
$('online-button').onclick = () => showOnlineMenu();
$('room-button').onclick = () => {
    if (online.room?.phase === 'lobby') showLobby(online.room);
    else if (game.state === 'playing') game.pause();
    else if (game.state === 'paused') showPause();
};
$('pause-button').onclick = () => game.pause();
$('landscape-pause').onclick = () => game.pause();
$('help-button').onclick = showHelp;
$('sound-button').onclick = async () => {
    sound.toggle();
    await sound.unlock();
    updateSoundButton();
};
/** 全屏可用性由浏览器决定，失败时给出恢复信息，避免未处理的 Promise 异常。 */
$('fullscreen-button').onclick = async () => {
    try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else if (document.documentElement.requestFullscreen)
            await document.documentElement.requestFullscreen();
        else toast('当前浏览器不支持全屏，可横屏游玩');
    } catch {
        toast('未能进入全屏，请使用浏览器全屏功能');
    }
};

/** 将 CSS 缩放与触屏留白换算回逻辑战场，鼠标命中位置不会随窗口变化漂移。 */
function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    // 所有尺寸均按 contain 留白换算，窗口高度约束后瞄准仍与实际画面严格对齐。
    const contained = true;
    const scale = Math.min(rect.width / 1280, rect.height / 800);
    const width = contained ? 1280 * scale : rect.width,
        height = contained ? 800 * scale : rect.height;
    return {
        x: clamp(((event.clientX - rect.left - (rect.width - width) / 2) / width) * 1280, 0, 1280),
        y: clamp(((event.clientY - rect.top - (rect.height - height) / 2) / height) * 800, 0, 800),
    };
}
canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'touch') {
        Object.assign(game.pointer, pointerPosition(event));
        game.pointer.used = true;
    }
});
canvas.addEventListener('pointerdown', async (event) => {
    if (event.button !== 0 || game.state !== 'playing' || event.pointerType === 'touch') return;
    Object.assign(game.pointer, pointerPosition(event));
    game.pointer.used = true;
    game.pointer.down = true;
    canvas.setPointerCapture(event.pointerId);
    await sound.unlock();
});
window.addEventListener('pointerup', (event) => {
    if (event.pointerType !== 'touch') game.pointer.down = false;
});
window.addEventListener('pointercancel', (event) => {
    if (event.pointerType !== 'touch') game.pointer.down = false;
});
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

/** 按键以物理键位读取，处理一次性技能时忽略系统重复事件。 */
window.addEventListener('keydown', (event) => {
    if (['playing', 'paused'].includes(game.state) && sound.context?.state !== 'running')
        void sound.unlock().then(updateSoundButton);
    // 房间码和章节表单使用自己的输入语义，P、M 等字母不能被战斗快捷键截走。
    if (event.target instanceof HTMLElement && event.target.matches('input,select,textarea')) return;
    if (!layer.hidden && event.code === 'Tab') {
        const focusable = [...layer.querySelectorAll('button')];
        if (!focusable.length) return;
        const first = focusable[0],
            last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
        return;
    }
    if (
        event.repeat &&
        [
            'Escape',
            'KeyP',
            'KeyQ',
            'KeyE',
            'KeyF',
            'KeyM',
            'ShiftLeft',
            'ShiftRight',
            'Numpad1',
            'Numpad2',
            'Numpad3',
            'ControlRight',
            'Slash',
        ].includes(event.code)
    )
        return;
    if (event.code === 'KeyM') {
        $('sound-button').click();
        return;
    }
    if (event.code === 'Escape' || event.code === 'KeyP') {
        event.preventDefault();
        if (helpPrevious !== null) closeHelp();
        else if (game.state === 'playing') game.pause();
        else if (game.state === 'paused') game.resume();
        return;
    }
    if (game.state === 'upgrade' && helpPrevious === null && /^Digit[123]$/.test(event.code)) {
        event.preventDefault();
        game.chooseUpgrade(game.choices[Number(event.code.slice(-1)) - 1].id);
        return;
    }
    if (game.state !== 'playing') return;
    if (
        [
            'Space',
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'Enter',
            'ShiftLeft',
            'ShiftRight',
            'ControlRight',
        ].includes(event.code)
    )
        event.preventDefault();
    game.keys.add(event.code);
    if (event.code === 'ShiftLeft' || (mode === 1 && event.code === 'ShiftRight')) game.dash(1);
    if (event.code === 'KeyQ') game.nova(1);
    if (event.code === 'KeyE') game.deployTurret(1);
    // P2 炮台：小键盘 3，或没有小键盘的笔记本上使用主键盘的「/ ?」键。
    if (event.code === 'Numpad3' || (mode === 2 && event.code === 'Slash')) game.deployTurret(2);
    if (event.code === 'Numpad1' || (mode === 2 && event.code === 'ShiftRight')) game.dash(2);
    if (event.code === 'Numpad2' || event.code === 'ControlRight') game.nova(2);
    if (event.code === 'KeyF' && !event.repeat) {
        game.autoFire = !game.autoFire;
        syncTouchFire();
        toast(`自动开火已${game.autoFire ? '开启' : '关闭'}`);
    }
});
window.addEventListener('keyup', (event) => game.keys.delete(event.code));
/** 切换应用或隐藏页面立即暂停，防止玩家离开时仍被攻击。 */
window.addEventListener('blur', () => {
    game.clearInput();
    if (game.state === 'playing') game.pause();
});
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        game.clearInput();
        game.pause();
    }
});

/** 触屏摇杆采用指针捕获，手指滑出区域后仍能正确结束输入。 */
const joystick = $('joystick');
let stickPointer = null;
function updateStick(event) {
    const rect = joystick.getBoundingClientRect(),
        dx = event.clientX - rect.left - rect.width / 2,
        dy = event.clientY - rect.top - rect.height / 2;
    const length = Math.hypot(dx, dy),
        max = 30,
        scale = length > max ? max / length : 1;
    game.stick.x = (dx * scale) / max;
    game.stick.y = (dy * scale) / max;
    joystick.firstElementChild.style.transform = `translate(${dx * scale}px,${dy * scale}px)`;
}
joystick.onpointerdown = (event) => {
    event.preventDefault();
    stickPointer = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    updateStick(event);
};
joystick.onpointermove = (event) => {
    if (event.pointerId === stickPointer) updateStick(event);
};
function releaseStick() {
    stickPointer = null;
    game.stick.x = 0;
    game.stick.y = 0;
    joystick.firstElementChild.style.transform = '';
}
joystick.onpointerup = releaseStick;
joystick.onpointercancel = releaseStick;
/**
 * 触屏开火键是「自动开火」开关：手机上双拇指同时按住摇杆和开火键很累，且技能键需要抬指。
 * 开启后战车自动瞄准最近敌军持续射击，玩家只需专注走位与释放技能。
 */
function syncTouchFire() {
    $('touch-fire').setAttribute('aria-pressed', String(game.autoFire));
    $('touch-fire').textContent = game.autoFire ? '自动' : '开火';
}
$('touch-fire').onpointerdown = (event) => {
    event.preventDefault();
    game.pointer.used = false;
    game.autoFire = !game.autoFire;
    syncTouchFire();
    toast(`自动开火已${game.autoFire ? '开启' : '关闭'}`);
};
// 触屏设备默认开启自动开火，并把装饰粒子减半，降低中低端手机的绘制压力。
if (coarsePointer) {
    game.autoFire = true;
    game.particleScale = 0.5;
}
syncTouchFire();
$('touch-dash').onpointerdown = (event) => {
    event.preventDefault();
    game.dash(1);
};
$('touch-support').onpointerdown = (event) => {
    event.preventDefault();
    game.deployTurret(1);
};
$('touch-nova').onpointerdown = (event) => {
    event.preventDefault();
    game.nova(1);
};

/** 刷新恢复后首次真实触摸或点击重新激活音频，不要求额外寻找静音开关。 */
document.addEventListener('pointerdown', () => {
    if (['playing', 'paused', 'upgrade'].includes(game.state) && sound.context?.state !== 'running')
        void sound.unlock().then(updateSoundButton);
});
/** 页面只有一条动画循环；长时间后台恢复时限制 dt，避免突然跳过整波战斗。 */
let lastTime = 0,
    hudTime = 0;
function frame(now) {
    const dt = Math.min(0.04, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    if (online.active) {
        online.update(dt);
        if (game.state === 'playing') game.updateEffects(dt);
        sound.update(game.state === 'playing', Math.min(1, game.enemies.length / 10));
    } else game.update(dt);
    renderer.draw(now);
    hudTime += dt;
    if (hudTime >= 0.08) {
        updateHud();
        hudTime = 0;
    }
    requestAnimationFrame(frame);
}
// 只暴露实例供浏览器诊断和回归脚本读取；正式游玩不依赖此入口。
window.emberline = { game, renderer, sound, online };
updateSoundButton();
updateHud();
updateLoadout();
document.fonts.ready.then(() => renderer.makeBackground());
requestAnimationFrame(frame);

// 分享链接自动打开加入表单；同标签页刷新优先恢复原来的受认证席位。
const savedRoom = online.saved(),
    invitedRoom = new URLSearchParams(location.search).get('room');
if (savedRoom && (!invitedRoom || invitedRoom === savedRoom.code)) {
    online.open({ type: 'resumeRoom', ...savedRoom }).catch((error) => {
        online.cleanup();
        showOnlineMenu(error.message);
    });
} else if (invitedRoom) showOnlineMenu();
