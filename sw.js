/** @type {Number} Cache版本 */
const CACHE_VERSION = 0.2;

/** @type {Object} 当前可用cacheName */
const CURRENT_CACHES = {
  offline: `offline-v${CACHE_VERSION}`,
};

/** @type {Array}  */
const OFFLINE_URL = [
  '404.html',
  '/assets/favicon.png',
];

/** 安装，预先获取需缓存资源 */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CURRENT_CACHES.offline).then(cache => cache.addAll(OFFLINE_URL))
  );
});

/** 清理 */
self.addEventListener('activate', event => {
  const cacheWhitelist = Object.values(CURRENT_CACHES);

  event.waitUntil(
    caches.keys().then(keyList => Promise.all(keyList.map(key => {
      if (!cacheWhitelist.includes(key)) {
        return caches.delete(key);
      }

      return true;
    })))
  );
});

/** 代理，部分浏览器暂不支持navigation request */
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(res => {
      if (res) {
        return res;
      }

      return fetch(event.request).then(res => {
        if (!res.ok) {
          return new Response('Response Error', {
            status: res.status,
            statusText: res.statusText,
          });
        }

        return caches.open(CURRENT_CACHES.offline).then(cache => {
          cache.put(event.request, res.clone());

          return res;
        })
      }).catch(() => caches.match('404.html'));
    })
  )
});