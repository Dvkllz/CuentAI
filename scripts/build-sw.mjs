import { readdir, writeFile } from "node:fs/promises";
const files = await readdir("dist/assets");
const version = files.find((f) => f.startsWith("index-") && f.endsWith(".js"));
const paths = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  ...files.map((f) => `/assets/${f}`),
];
await writeFile(
  "dist/sw.js",
  `const CACHE=${JSON.stringify(`cuentai-${version}`)};const FILES=${JSON.stringify(paths)};
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('cuentai-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/'))return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}return r;}).catch(()=>caches.match(e.request).then(r=>r||(e.request.mode==='navigate'?caches.match('/index.html'):Response.error()))));});`,
);
console.log("Shell offline generado.");
