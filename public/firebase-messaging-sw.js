
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');


firebase.initializeApp({
   apiKey: "AIzaSyA2OP6rlzsvIn_l0WcezTLXkLisu3AvpvI",
  authDomain: "attendance-management-3f5f5.firebaseapp.com",
  projectId: "attendance-management-3f5f5",
  storageBucket: "attendance-management-3f5f5.firebasestorage.app",
  messagingSenderId: "593219809299",
  appId: "1:593219809299:web:a59c8988ba774fb54a0fe6",
  measurementId: "G-8MV6TKKSE5"
}
);

const messaging = firebase.messaging();

// shows notification when app is in background
messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || 'Attendance Update';
  const options = {
    body: payload?.notification?.body || '',
    icon: '/icons/icon-192.png' // optional if you add an icon
  };
  self.registration.showNotification(title, options);
});
