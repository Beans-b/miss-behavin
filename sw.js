/* Miss Behavin' LineSheet — service worker, build 132 / Worker v107.
 *
 * ONE JOB: turn a push into a notification on the lock screen, and land the tap
 * on the sheet that is actually waiting. It does not cache anything, and that is
 * deliberate — the app already polls its own footer for a new build and offers a
 * reload, and a caching service worker would fight that check and serve a stale
 * app for days. Adding caching here would break the one mechanism that keeps the
 * home-screen app current.
 *
 * The push carries NO payload. The Worker sends a bare wake-up because RFC 8291
 * payload encryption is a large amount of hand-rolled crypto that cannot be
 * verified without a live browser subscription, so the wording lives here where
 * it can be read and changed. The cost is that the text is generic; the benefit
 * is that it cannot be silently wrong.
 *
 * build 132 — TWO CHANGES, both about not lying and not landing wrong.
 *
 * 1. The wording. Sheets now travel in BOTH directions: out to be named and
 *    priced, and back for a review or a question. This file could only ever say
 *    one sentence, and it said "tap to name and price it" — so a sheet Kelly
 *    sent BACK to Brian arrived on his phone as a job he does not do. Since the
 *    push cannot carry the specifics, the text no longer pretends to know them.
 *    It says something is waiting and sends you to the queue, which does know.
 *    The SMS is the channel that carries real wording; it still names the sheet,
 *    the person and the reason, because a text is plain text and cannot be wrong
 *    about that.
 *
 * 2. The tap. It used to focus whatever was already open and stop there — on a
 *    phone that meant landing on whatever screen was last used, which, with one
 *    shared active sheet behind it, was routinely a different invoice entirely.
 *    An already-open app is now told a notification was tapped and routes itself
 *    to the handoff queue; a closed app opens on ?h=1, which does the same on
 *    boot. Deliberately a message rather than navigate(): navigating reloads the
 *    page, and reloading somebody mid-way through pricing a sheet to show them
 *    that sheet is not a fix.
 */
var TITLE = "Miss Behavin' LineSheet";
var BODY  = 'Something is waiting for you in LineSheet — tap to see what.';
var TAG   = 'mb-handoff';   // one notification, replaced — not a stack of five
var LAND  = '/?h=1';        // read on boot; routes to the handoff queue

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
      data: { url: LAND }
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  // Focus the app if it is already open rather than stacking another copy —
  // on a phone that is the difference between "it worked" and "why do I have
  // four of these". build 132: focusing is no longer enough on its own, so the
  // open copy is also TOLD the notification was tapped and routes itself.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if ('focus' in c) {
          try { c.postMessage({ type: 'mb-notification-click', url: LAND }); } catch (e) { /* older browser */ }
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(LAND);
    })
  );
});
