/* MediSpark push notification service worker (Firebase Cloud Messaging).
   Config values are public Firebase web SDK identifiers. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getMessaging, onBackgroundMessage } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging.js";

initializeApp({
  apiKey: "AIzaSyAXKVJLxgZsOTCBJRTJmBs5H3wLlZdj514",
  authDomain: "shsmc-blood-portal.firebaseapp.com",
  projectId: "shsmc-blood-portal",
  storageBucket: "shsmc-blood-portal.firebasestorage.app",
  messagingSenderId: "968307626441",
  appId: "1:968307626441:web:9cb217fd903766be4a9818",
});

const messaging = getMessaging();

onBackgroundMessage(messaging, (payload) => {
  const title = payload.notification?.title ?? "MediSpark";
  const body =
    payload.notification?.body ?? "You have a new notification.";
  const url = (payload.data && payload.data.url) || "/dashboard/notifications";
  self.registration.showNotification(title, {
    body,
    icon: "/medispark-official-logo.jpg",
    badge: "/medispark-official-logo.jpg",
    data: { url },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/dashboard/notifications";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
