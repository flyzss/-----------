# Windows + NGINX 公网部署

以下以项目目录 `D:\wwwroot\emberline`、NGINX 目录 `D:\nginx`、域名 `tank.example.com` 为例，请替换为实际值。Node 服务同时提供页面和联机，不需要数据库或前端构建。

## 当前 /tank/ 公网入口

当前目标为 `https://games.frp.q-auto-parts.com/tank/`。使用同目录的 `nginx-tank-locations.conf.example`：将其中三个 location 块加入该域名现有的 server 块。程序目录可保持独立，Node 仍监听 `127.0.0.1:8080`。

NGINX 将 `/tank/` 前缀剥离后转发给 Node；前端会自动把页面、接口、WebSocket 和邀请链接放在 `/tank/` 下。`proxy_pass http://127.0.0.1:8080/;` 最后的斜杠须保留。针对当前公开 HTTPS 域名，示例固定转发 Host 和 https，兼容外层 FRP 终止 TLS。

更新游戏文件后，进入现有 NGINX 目录运行 `nginx.exe -t`，检查成功后 `nginx.exe -s reload`。验证地址为 `/tank/api/health`，联机握手路径为 `/tank/ws`，邀请应包含 `/tank/index.htm?room=...`。只有 `/tank` 会补上末尾斜杠，站点其他路径保持原有配置。

后面的完整 HTTP/HTTPS server 示例用于独立域名根目录部署；当前子目录方案使用上述 location 片段。

## 1. 上传并启动 Node

上传整个项目，包含 server、js、fonts、image、audio、入口文件、package.json、package-lock.json 和 deploy。无需上传 .git、node_modules、.impeccable 或运行日志。Node.js 需要 22 或更新版本。

在服务器 PowerShell 执行：

```powershell
Set-Location -LiteralPath 'D:\wwwroot\emberline'
npm ci --omit=dev
powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\deploy\windows\Start-Server.ps1'
```

脚本绑定 `127.0.0.1:8080`，等待 Node 结束，并把输出写到项目 logs 目录。另开窗口检查：

```powershell
Invoke-RestMethod 'http://127.0.0.1:8080/api/health'
```

应返回 game 为 emberline、online 为 true。本机健康接口的邀请地址不作为公网验收依据；邀请要从公网域名打开页面后生成。

## 2. 配置 NGINX

初次 HTTP 测试可使用 nginx-http.conf.example。将域名改成实际域名，把 server 块放到 nginx.conf 的 http 块内，或由 http 内的 include 加载。没有域名时可暂用公网 IP 作为 server_name。

已有 HTTPS 站点时，保留原有证书及监听，将示例中的两个 location 块放进现有 HTTPS server 块，替换冲突的旧 location。全新 HTTPS 站点可使用 nginx-https.conf.example，填写真实证书路径。两个完整示例二选一，不要原样同时加载。

页面、`/api/health`、`/ws` 必须都到同一个 Node 实例。WebSocket 需 Upgrade / Connection 转发；Host 保留原域名和端口，X-Forwarded-Proto 保留 https。Windows 的 NGINX 路径用正斜杠。

在实际 NGINX 根目录执行：

```powershell
Set-Location -LiteralPath 'D:\nginx'
.\nginx.exe -t
# 仅在配置检查 successful 后执行重载。
.\nginx.exe -s reload
```

## 3. 域名与端口

- 域名 A 记录指向公网 IPv4；如设置 AAAA，IPv6 也须正确可达。
- 云安全组与 Windows 防火墙允许网站使用的 TCP 80/443。Node 的 8080 保持本机监听。
- HTTPS 填写覆盖该域名的证书，并保留现有自动续期配置。
- 支持独立域名根目录和 `/tank/` 子目录；子目录按上面的专用 NGINX 片段转发。

## 4. 后台运行与开机启动

在服务器“任务计划程序”创建任务 Emberline：

- 常规：选择具备项目读取、Node 执行、logs 写入权限的运行账户，勾选“不管用户是否登录都要运行”。密码在服务器本机窗口输入。
- 触发器：计算机启动时。
- 程序：`C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`。
- 参数：`-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "D:\wwwroot\emberline\deploy\windows\Start-Server.ps1" -NodePath "C:\Program Files\nodejs\node.exe"`。NodePath 使用服务器 `Get-Command node.exe` 显示的完整路径。
- 起始于：`D:\wwwroot\emberline`。
- 设置：失败后每分钟重启；取消“运行超过某时长后停止”；已有实例时“不启动新实例”。

先结束手动测试进程，确认 8080 已释放，再运行任务。检查健康接口以及 logs/node.stdout.log、logs/node.stderr.log。NGINX 沿用服务器现有的后台与开机启动方式。

更新时先结束本游戏任务，确认端口已释放，再替换文件、执行 npm ci 并启动任务。Node 重启会结束已有房间。当前房间只在单个 Node 进程内存中，先部署一个实例，不使用多实例轮询。

## 5. 公网验证

1. 另一台设备访问公网 `/api/health` 和 `/index.htm`。
2. 创建房间，确认邀请链接使用公网域名，而非 localhost 或内网 IP。
3. 队友加入，验证准备、移动、开火、改装及刷新恢复。
4. 浏览器 Network / WS 中，`/ws` 应返回 101 并持续收发消息。

网页正常但联机失败，优先检查 `/ws` 与 Host；502 则检查 Node、端口和 stderr 日志。

## 官方参考

- [NGINX WebSocket 转发](https://nginx.org/en/docs/http/websocket.html)
- [NGINX Windows 管理](https://nginx.org/en/docs/windows.html)
- [Windows 计划任务](https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/new-scheduledtaskaction)
