# 由手动测试或任务计划程序启动；此文件不注册任务或修改防火墙。
[CmdletBinding()]
param(
    # Node 只监听回环地址，公网请求由同机 NGINX 转发。
    [ValidateRange(1, 65535)]
    [int]$Port = 8080,
    [ValidateSet('127.0.0.1', '::1')]
    [string]$ListenAddress = '127.0.0.1',
    # 后台任务建议传入完整路径，避免依赖登录账户的 PATH。
    [string]$NodePath = 'node.exe'
)

$ErrorActionPreference = 'Stop'
try {
    # 根据脚本位置定位仓库；上传到其他盘符后无需修改业务代码。
    $projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
    $entryPath = Join-Path $projectRoot 'server/index.js'
    if (-not (Test-Path -LiteralPath $entryPath -PathType Leaf)) {
        throw '找不到 server/index.js，请保留完整项目目录结构。'
    }
    $nodeExecutable = (Get-Command -Name $NodePath -CommandType Application -ErrorAction Stop).Source
    $majorVersion = (& $nodeExecutable -p 'process.versions.node.split(".")[0]')

    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules/ws/package.json'))) {
        throw '请先在项目根目录执行 npm ci --omit=dev。'
    }
    $logDirectory = Join-Path $projectRoot 'logs'
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
    # 环境变量只传给当前脚本的子进程，端口须与 NGINX 配置一致。
    $env:HOST = $ListenAddress
    $env:PORT = [string]$Port
    $arguments = '"{0}"' -f $entryPath
    $process = Start-Process -FilePath $nodeExecutable -ArgumentList $arguments -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDirectory 'node.stdout.log') -RedirectStandardError (Join-Path $logDirectory 'node.stderr.log')
    Write-Host ('游戏进程 PID：{0}；监听：{1}:{2}' -f $process.Id, $ListenAddress, $Port)
    Write-Host ('日志目录：{0}' -f $logDirectory)
    # 等待 Node，保留退出码，供任务计划程序按失败重试策略处理。
    $process.WaitForExit()
    $process.Refresh()
    exit $process.ExitCode
}
catch {
    Write-Error -Message $_.Exception.Message -ErrorAction Continue
    exit 1
}
