const CACHE_NAME = 'csv-horizon-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/users/list',
  '/users/add',
  '/manifest.json',
];

// API キャッシュ戦略
const API_CACHE_NAME = 'csv-horizon-api-v1';
const CACHEABLE_API_PATTERNS = [
  /\/api\/users\/status-counts/,
  /\/api\/users\?.*per_page=\d+/,
];

// Service Worker のインストール
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching static assets');
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Service Worker のアクティベーション
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// フェッチイベントの処理
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API リクエストの処理
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // 静的リソースの処理
  if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request));
  }
});

// API リクエストの処理
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // キャッシュ可能な API かチェック
  const isCacheable = CACHEABLE_API_PATTERNS.some(pattern => 
    pattern.test(url.pathname + url.search)
  );

  if (!isCacheable || request.method !== 'GET') {
    // キャッシュしない API または GET 以外のリクエスト
    return fetch(request);
  }

  try {
    // Network First 戦略（短期間のキャッシュ）
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      // レスポンスをクローンしてキャッシュに保存
      cache.put(request, response.clone());
      
      // オリジナルのレスポンスをカスタムヘッダー付きで返す
      const customResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'X-Cache-Status': 'MISS'
        }
      });
      
      return customResponse;
    }
    
    return response;
  } catch (error) {
    // ネットワークエラーの場合、キャッシュから返す
    console.log('[ServiceWorker] Network failed, trying cache');
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // キャッシュヒットをヘッダーで示す
      const customResponse = new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: {
          ...Object.fromEntries(cachedResponse.headers.entries()),
          'X-Cache-Status': 'HIT'
        }
      });
      
      return customResponse;
    }
    
    throw error;
  }
}

// 静的リソースの処理
async function handleStaticRequest(request) {
  try {
    // Cache First 戦略
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // キャッシュになければネットワークから取得
    const response = await fetch(request);
    
    if (response.ok && request.url.startsWith(self.location.origin)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // ネットワークエラーの場合、オフラインページや代替レスポンス
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      return cache.match('/') || new Response('オフラインです', {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    throw error;
  }
}

// バックグラウンド同期（将来の機能拡張用）
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background Sync:', event.tag);
  // 将来的にオフライン時のデータ同期などに使用
});

// プッシュ通知（将来の機能拡張用）
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received');
  // 将来的にプッシュ通知機能に使用
});