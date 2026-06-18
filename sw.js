// ============================================================
// 儿童手机管控 - Service Worker
// 功能: 离线缓存 / 后台计时 / 超时通知
// ============================================================

const CACHE_NAME = 'kids-control-v2';
const urlsToCache = [
    './index.html',
    './manifest.json'
];

// ---------- 安装：预缓存 ----------
self.addEventListener('install', function(event) {
    console.log('[SW] 安装中...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('[SW] 缓存文件:', urlsToCache);
            return cache.addAll(urlsToCache).catch(function(err) {
                console.warn('[SW] 部分文件缓存失败:', err);
            });
        })
    );
    // 立即激活，不等待旧SW
    self.skipWaiting();
});

// ---------- 激活：清理旧缓存 ----------
self.addEventListener('activate', function(event) {
    console.log('[SW] 激活');
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(name) {
                    return name !== CACHE_NAME;
                }).map(function(name) {
                    console.log('[SW] 删除旧缓存:', name);
                    return caches.delete(name);
                })
            );
        })
    );
    self.clients.claim();
});

// ---------- 请求拦截：缓存优先 ----------
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            // 缓存命中，直接返回
            if (response) {
                return response;
            }
            // 否则走网络，同时更新缓存
            return fetch(event.request).then(function(networkResponse) {
                // 只缓存成功的GET请求
                if (networkResponse && networkResponse.status === 200 &&
                    event.request.method === 'GET') {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(function() {
                // 网络失败，如果请求的是HTML则返回缓存主页
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
                // 其他资源静默失败
                return new Response('', { status: 408 });
            });
        })
    );
});

// ---------- 后台消息：主线程可发送计时器状态 ----------
let backgroundTimerEnd = null;

self.addEventListener('message', function(event) {
    const data = event.data;

    if (data.action === 'setTimer') {
        // 主线程告知倒计时结束时间戳
        backgroundTimerEnd = data.targetTime;
        console.log('[SW] 收到计时器:', new Date(backgroundTimerEnd).toLocaleTimeString());

        // 计算延迟
        const delay = backgroundTimerEnd - Date.now();
        if (delay > 0) {
            // 设置后台定时器（精度有限，但聊胜于无）
            setTimeout(function() {
                notifyAllClients();
            }, Math.min(delay, 60000)); // 最多等60秒，之后靠visibility检查
        }
    }

    if (data.action === 'clearTimer') {
        backgroundTimerEnd = null;
        console.log('[SW] 清除计时器');
    }
});

// ---------- 通知所有客户端 ----------
function notifyAllClients() {
    self.clients.matchAll().then(function(clients) {
        clients.forEach(function(client) {
            client.postMessage({
                action: 'timerExpired',
                timestamp: Date.now()
            });
        });
    });
}
