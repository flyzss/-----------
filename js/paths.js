/** 从模块地址确定应用目录；反向代理挂到 /tank/ 后不再误访问站点根目录接口。 */
export function resolveAppBase(moduleHref, pageHref) {
    const moduleUrl = new URL(moduleHref);
    if (moduleUrl.protocol === 'http:' || moduleUrl.protocol === 'https:') {
        return new URL('../', moduleUrl);
    }
    // Node 中的协议测试使用 file 模块；运行时按测试页面地址恢复同样的目录语义。
    return new URL('./', pageHref);
}

/** 拼接应用内的资源或接口；切换到局域网分享域名时仍保留当前应用目录。 */
export function appUrl(resource, shareOrigin) {
    const base = resolveAppBase(import.meta.url, location.href);
    if (shareOrigin) base.host = new URL(shareOrigin).host;
    return new URL(resource, base);
}

/** HTTPS 页面使用 WSS，路径随当前部署目录变化，根目录部署仍使用 /ws。 */
export function websocketUrl() {
    const url = appUrl('ws');
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return url.href;
}

/** 不同子目录的应用各自保存恢复凭据，避免共用域名时把房间令牌发给错误实例。 */
export function roomStorageKey() {
    return `emberline-room:${appUrl('').pathname}`;
}
