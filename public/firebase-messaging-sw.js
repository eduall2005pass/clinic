/* MediSpark push notification service worker (Firebase Cloud Messaging).
   Config values are public Firebase web SDK identifiers. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getMessaging, onBackgroundMessage } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-sw.js";

initializeApp({
  apiKey: "AIzaSyCmDXN01lk15m7ZDGTTyUN7D9YFljMPX8I",
  authDomain: "medisparkgo.firebaseapp.com",
  projectId: "medisparkgo",
  storageBucket: "medisparkgo.firebasestorage.app",
  messagingSenderId: "971205669963",
  appId: "1:971205669963:web:fa88bf03ecf56b496a89ce",
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
