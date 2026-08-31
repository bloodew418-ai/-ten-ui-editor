/* TEN UI EDITOR — offline shell v0.1.8 (edge-tab visibility fix) */
var CACHE = "ten-ui-editor-v15-edge-tabs";
var ASSETS = [
  "./",
  "./index.html",
  "./index-v0.1.1.html",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./jog-v012.css",
  "./jog-v012.js",
  "./jog-v017-patch.css",
  "./jog-v017-patch.js"
];
self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(ASSETS.map(function (u) { return c.add(u).catch(function () {}); }));
  }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).then(function (res) {
      var copy=res.clone();caches.open(CACHE).then(function(c){c.put(e.request,copy).catch(function(){})});return res;
    }).catch(function () {
      return caches.match(e.request).then(function(hit){
        if(hit)return hit;
        return caches.match("./index.html").then(function(fallback){return fallback || Response.error();});
      });
    }));
    return;
  }
  e.respondWith(caches.match(e.request).then(function(hit){
    if(hit)return hit;
    return fetch(e.request).then(function(res){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(e.request,copy).catch(function(){})});return res;});
  }));
});
