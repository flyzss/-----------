---
name: "余烬防线 / EMBERLINE"
description: "在废弃工业区的灰烬中，用装甲守住最后的水晶之光。"
colors:
  ember-amber: "#f7a358"
  crystal-green: "#b9edac"
  damage-coral: "#f17a68"
  shell-ink: "#111817"
  panel-ink: "#18201e"
  pale-ink: "#edf0dd"
  muted-sage: "#9da99d"
  seam-green: "#344039"
  upgrade-surface: "#233027"
  olive-concrete: "#343e30"
typography:
  display:
    fontFamily: "Chakra, 'Microsoft YaHei', sans-serif"
    fontSize: "23px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "1px"
  headline:
    fontFamily: "'Microsoft YaHei', 'PingFang SC', sans-serif"
    fontSize: "clamp(28px, 3.7vw, 62px)"
    fontWeight: 800
    lineHeight: 1.32
    letterSpacing: "1px"
  title:
    fontFamily: "'Microsoft YaHei', 'PingFang SC', sans-serif"
    fontSize: "30px"
    fontWeight: 700
    letterSpacing: "2px"
  body:
    fontFamily: "'Microsoft YaHei', 'PingFang SC', sans-serif"
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: "'Microsoft YaHei', 'PingFang SC', sans-serif"
    fontSize: "11px"
    fontWeight: 400
  telemetry:
    fontFamily: "Chakra, 'Microsoft YaHei', sans-serif"
    fontSize: "25px"
    fontWeight: 700
    letterSpacing: "1px"
rounded:
  square: "0px"
  keycap: "2px"
  touch: "50%"
spacing:
  compact: "8px"
  small: "12px"
  medium: "16px"
  section: "20px"
  wide: "28px"
components:
  button-primary:
    backgroundColor: "{colors.ember-amber}"
    textColor: "#1d251c"
    rounded: "{rounded.square}"
    padding: "16px 22px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.muted-sage}"
    rounded: "{rounded.square}"
    padding: "12px"
  button-tool:
    backgroundColor: "transparent"
    textColor: "{colors.muted-sage}"
    typography: "{typography.label}"
    padding: "4px"
  mode-option:
    backgroundColor: "transparent"
    textColor: "#a6b19b"
    padding: "10px 0"
  upgrade-card:
    backgroundColor: "{colors.upgrade-surface}"
    textColor: "{colors.pale-ink}"
    rounded: "{rounded.square}"
    padding: "22px 18px"
  armor-meter:
    backgroundColor: "#354438"
    height: "4px"
---

# Design System: 余烬防线 / EMBERLINE

## Overview

**Creative North Star: "灰烬中的水晶防线"**

废弃工业区是一张仍在运转的作战台：橄榄色混凝土、墨绿色外壳、浅绿水晶和琥珀炮火组成材料语言。界面克制，战场具体；程序化绘制的履带、车体装甲、倒角掩体、管线和磨损纹理形成手绘般的层次。

玩家从开场、战斗、改装到结算始终留在同一实时场景中。文字和遥测服务于下一步操作，环境细节服务于空间记忆；弹道、受击和威胁必须从地面纹理中清楚分离。本文件记录已实现的 `main.css`、`index.htm` 与 `js/renderer.js`，不代表未落地的概念稿。

**Key Characteristics:**

- 工业废墟的粗粝地面与清晰装甲剪影。
- 墨色直角外壳、细接缝、有限的琥珀与水晶绿强调。
- 中文指令配合窄直几何英文标记和数值。
- 场景内操作，桌面遥测与触屏操作台随空间重排。

## Colors

低饱和深绿承载场景，温暖炮火与浅绿生命信号承担识别任务；规范色值以 frontmatter 为准。

### Primary

- **余烬琥珀**：启动、继续等主操作，选中下划线、技能状态、升级图标和重要数值。

### Secondary

- **水晶浅绿**：核心与友军的生命信号、装甲条、已完成波次与在线状态。
- **受击珊瑚**：危险与伤害反馈；不要将其当作普通装饰强调色。

### Neutral

- **外壳墨绿 / 面板墨绿**：页面底与驾驶员信息条，形成低对比的结构分层。
- **浅色油墨 / 灰鼠尾草**：主要内容与次要说明，保持阅读层级。
- **接缝绿 / 改装面绿**：细边界及可选择的装甲改装面板。
- **橄榄混凝土**：Canvas 基础地面；地表另有种子纹理与道路色，不把每个噪点提升为界面色标。

**The Signal Rule.** 强色优先表达行动、友军生命和危险，地面保持低饱和，不能与炮火争夺注意力。

## Typography

**Display Font:** 自托管 Chakra Petch Bold，CSS 家族名为 Chakra；中文回退 Microsoft YaHei。
**Body Font:** Microsoft YaHei、PingFang SC、sans-serif。

英文标记与数值有装甲铭牌般的机械感，中文指令保持系统黑体的清晰度。Chakra 仅提供粗体字重，不假设本地存在其他字重或中文字符。

### Hierarchy

- **Display**：品牌英文；另用于波次、遥测和结果数字，各自按内容层级缩放。
- **Headline**：开场两行标题；桌面使用响应式字号，窄屏最终覆盖为 32px，短横屏为 28px。
- **Title**：模态标题；窄屏降至 24px，短横屏为 23px。侧栏标题单独采用较轻字重。
- **Body**：常规按钮与正文；开场正文行高 1.95，模态正文行高 1.8。
- **Label**：功能性辅助文字与状态以 11px 为最低基线。装饰铭文的小字不构成功能文字规范。
- **Telemetry**：常态统计为 25px，较窄布局为 21px；结果数字为 36px，优先保证扫描速度。

**The Readable Orders Rule.** 不把徽章微字、分隔符或地面涂字的装饰尺寸复制给操作提示与状态信息。

## Layout

桌面外框最大宽度 1776px，页头与主区左右留白 38px。主区由可伸缩战场和 248px 作战栏组成，间隔 28px；1700px 以上作战栏扩为 270px。战场逻辑坐标始终为 1280 × 800，常态显示比例为 1.6。

1150px 以下侧栏收至 200px，外边距与间距收紧。850px 以下改为上下布局，雷达、侧栏导语和键盘长说明收起，核心、波次、改装重新分栏。560px 以下遥测为两栏，改装跨栏；升级选项由三列改为单列，避免缩小文字。

竖屏最终战场外框比例为 1 / 1.08，游玩时在底部留出 120px 触控台，Canvas 使用剩余高度并完整容纳逻辑战场；待命时 Canvas 铺满外框。粗指针设备在战斗中显示左摇杆和右侧技能、开火按钮。摇杆为 92px，开火为 68px，其余动作按钮为 49px。

高度不超过 600px 的横屏布局隐藏底部驾驶员栏、侧栏与页脚，战场高为 `calc(100dvh - 92px)`；页头提供独立暂停入口。触屏横屏控制保持覆盖在场景上。不能在隐藏底栏时同时丢失暂停操作。

## Elevation & Depth

界面以色阶、接缝和覆盖关系分层。战场使用柔和结构阴影（`0 18px 45px #0003`）；模态使用深墨半透明遮罩与 5px 背景模糊，仍能感知下方战场。开场渐变罩允许右侧场景透出，避免成为独立宣传页。

Canvas 深度来自投影、掩体顶部亮面与侧面暗部、履带和装甲叠层、水晶光晕及粒子。环境纹理预绘，实体、弹道和受击反馈逐帧合成。纯地表装饰不得画得像可碰撞掩体。

## Shapes

页面结构和按钮以直角为主，1px 接缝保持工业面板感。微圆角用于键帽；圆形只承担摇杆、触控动作和信号点等对应形态。水晶使用菱形切面，实体倒角通过 Canvas 明暗面实现，不把网页容器统一做成圆角卡片。

## Components

### Buttons

主按钮是实色琥珀的启动踏板，文字深绿，左右分布指令与方向图标。悬停变亮并上移 2px，150ms 过渡。次按钮无实心背景，通过细底线和灰绿文字保持层级。工具按钮采用描边 SVG 与简短文字；窄屏收起文字，保留可访问名称。

键盘焦点统一采用琥珀色 2px 外轮廓，偏移 5px。禁用按钮透明度为 0.4，不能只靠颜色表达选中或禁用状态。

### Mode Selector

单人 / 双人采用并排真实按钮。选中项使用亮字和琥珀下划线，并同步 `aria-pressed`；不是独立页面导航。

### Upgrade Cards

三选一改装使用带绿灰描边的直角按钮，图标、名称、效果说明和数字快捷键形成明确层级。悬停或键盘焦点时边框变琥珀、底色变亮并上移 4px。窄屏改为图标左置的紧凑单列，不隐藏效果说明。选择期间模拟停止。

### HUD and Radar

装甲为纤细进度条，核心条略厚；六段波次轨迹以完成浅绿、当前琥珀区分进度。雷达图例通过文字和点形补充颜色识别。实时状态置于战场上缘，避免覆盖中心交火区。

### Scene Overlays

暂停、帮助、改装和结算均在战场内使用模态层。焦点进入模态，Tab 在可操作按钮间循环，关闭时恢复先前焦点；过高说明自然滚动。结果显示真实战役数据。短提示与波次横幅不拦截指针。

### Motion and Sound

过渡以 150–250ms 的状态反馈为主。`prefers-reduced-motion: reduce` 关闭 CSS 过渡，并在 Canvas 中取消震屏、全屏闪光及悬浮摆动；必要弹道和战斗动画继续显示。音频由 Web Audio 合成，在真实用户操作后解锁，静音按钮和 M 键同步状态；声音不可用时仍能游玩。

## Do's and Don'ts

### Do:

- **Do** 让炮弹、敌我剪影、核心状态从工业纹理中清楚分离。
- **Do** 使用同一场景承接启动、战斗、改装与结算。
- **Do** 保留键盘焦点、触屏多指操作与横屏独立暂停入口。
- **Do** 将自动化浏览器与模拟测试作为行为证据，另由真人确认音质、节奏和战斗手感。

### Don't:

- **Don't** 把地面装饰画成可碰撞实体，或让粒子遮蔽关键威胁。
- **Don't** 将小于功能文字基线的装饰字扩展为操作信息样式。
- **Don't** 用未由真实战役状态产生的胜利数值或截图代替结算验证。
- **Don't** 用浏览器通过与模拟测试通过宣称真人听感或战斗体验已获验证。
