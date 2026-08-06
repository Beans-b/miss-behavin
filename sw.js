/* Miss Behavin' LineSheet — service worker, build 102 / Worker v92.
 *
 * ONE JOB: turn a push into a notification on the lock screen. It does not
 * cache anything, and that is deliberate — the app already polls its own footer
 * for a new build and offers a reload, and a caching service worker would fight
 * that check and serve a stale app for days. Adding caching here would break the
 * one mechanism that keeps the home-screen app current.
 *
 * The push carries NO payload. The Worker sends a bare wake-up because RFC 8291
 * payload encryption is a large amount of hand-rolled crypto that cannot be
 * verified without a live browser subscription, so the wording lives here where
 * it can be read and changed. The cost is that the text is generic; the benefit
 * is that it cannot be silently wrong.
 */
var TITLE = "Miss Behavin' LineSheet";
var BODY  = 'A sheet is waiting for you — tap to name and price it.';
var TAG   = 'mb-handoff';   // one notification, replaced — not a stack of five

self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (event) {
  var body = BODY;
  // Payload-free is the norm, but if one ever arrives, use it rather than
  // ignoring a more specific message.
  try { if (event.data) { var t = event.data.text(); if (t) body = t; } } catch (e) { /* keep the default */ }
  event.waitUntil(
    self.registration.showNotification(TITLE, {
      body: body,
      tag: TAG,
      renotify: true,
      requireInteraction: false,
      data: { url: '/' }
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  // Focus the app if it is already open rather than stacking another copy —
  // on a phone that is the difference between "it worked" and "why do I have
  // four of these".
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) return list[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
