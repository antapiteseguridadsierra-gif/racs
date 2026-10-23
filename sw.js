/* RACS · Service worker: deja la app disponible sin internet.
   ============================================================
   CADA VEZ QUE CAMBIES index.html EN GITHUB, CAMBIA ESTE NÚMERO:
   racs-v1  →  racs-v2  →  racs-v3 ...
   ============================================================ */
var VERSION = "racs-v1";

var LIBS = [
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
];
var LOCAL = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(VERSION).then(function(c){
      var locales = LOCAL.map(function(u){ return c.add(u).catch(function(){}); });
      var libs = LIBS.map(function(u){
        return fetch(u, { mode:"cors" }).then(function(r){ if(r && r.ok) return c.put(u, r); }).catch(function(){});
      });
      return Promise.all(locales.concat(libs));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.filter(function(k){ return k !== VERSION; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("message", function(e){ if(e.data && e.data.tipo === "SKIP_WAITING") self.skipWaiting(); });

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  var url = new URL(req.url);
  var propio = url.origin === self.location.origin;
  var cdn = url.hostname === "cdnjs.cloudflare.com";
  if(!propio && !cdn) return;

  e.respondWith(
    caches.open(VERSION).then(function(cache){
      return cache.match(req, { ignoreSearch:true }).then(function(hit){
        var red = fetch(req).then(function(r){
          if(r && r.ok) cache.put(req, r.clone());
          return r;
        }).catch(function(){ return null; });

        if(hit){ e.waitUntil(red); return hit; }
        return red.then(function(r){
          if(r) return r;
          if(req.mode === "navigate") return cache.match("./index.html").then(function(p){ return p || cache.match("./"); });
          return Response.error();
        });
      });
    })
  );
});
