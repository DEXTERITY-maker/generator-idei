/* Генератор идей: работа без интернета.
   Страница — сначала из сети (чтобы обновления приходили сразу), но не дольше 3 секунд,
   если в кэше уже есть копия; без сети — из кэша. Иконки и манифест — из кэша. */
const CACHE = "idei-v1";
const HOME = new URL("./", self.location).href;
const FILES = [HOME, "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    let saving = Promise.resolve();
    const net = fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        saving = caches.open(CACHE).then((c) => c.put(HOME, copy));
      }
      return res;
    });
    e.waitUntil(net.then(() => saving, () => {}));
    e.respondWith(
      caches.match(HOME).then((cached) => {
        if (!cached) return net;                       // первый визит — ждём сеть
        const late = new Promise((r) => setTimeout(() => r(cached), 3000));
        return Promise.race([net.then((res) => (res.ok ? res : cached), () => cached), late]);
      })
    );
    return;
  }

  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
