/* TEN UI EDITOR — offline shell + v0.1.2 jog injector */
var CACHE = "ten-ui-editor-v2";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./jog-v012.css",
  "./jog-v012.js"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(ASSETS.map(function (u) {
      return c.add(u).catch(function () {});
    }));
  }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) {
      return k === CACHE ? null : caches.delete(k);
    }));
  }).then(function () { return self.clients.claim(); }));
});

function injectJog(res) {
  var ct = res.headers.get("content-type") || "";
  if (ct.indexOf("text/html") < 0) return Promise.resolve(res);
  return res.text().then(function (html) {
    if (html.indexOf("jog-v012.js") < 0) {
      html = html.replace("</head>", '<link rel="stylesheet" href="jog-v012.css"></head>');
      html = html.replace("</body>", '<script src="jog-v012.js"></script></body>');
    }
    var headers = new Headers(res.headers);
    headers.set("content-type", "text/html; charset=utf-8");
    return new Response(html, {status:res.status,statusText:res.statusText,headers:headers});
  });
}

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then(function (res) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(e.request, copy).catch(function () {}); });
    if (e.request.mode === "navigate") return injectJog(res);
    return res;
  }).catch(function () {
    return caches.match(e.request).then(function (hit) {
      if (hit) return e.request.mode === "navigate" ? injectJog(hit) : hit;
      return caches.match("./index.html").then(function (fallback) { return injectJog(fallback); });
    });
  }));
});
