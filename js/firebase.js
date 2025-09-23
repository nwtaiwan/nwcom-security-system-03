import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyARZNcyxLDUaC0xET4mfQw8sHLGzO8jNJE",
  authDomain: "nwcom-security-system-01.firebaseapp.com",
  projectId: "nwcom-security-system-01",
  storageBucket: "nwcom-security-system-01.firebasestorage.app",
  messagingSenderId: "757708581539",
  appId: "1:757708581539:web:30a6b947e37a6b81f3ed16",
  measurementId: "G-X2TSTPJHHG"
};

let app, auth, db, storage, secondaryAuth;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    const secondaryAppName = 'user-creation-app';
    let secondaryApp;
    try {
        secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    } catch (error) {
        secondaryApp = getApp(secondaryAppName);
    }
    secondaryAuth = getAuth(secondaryApp);

} catch (e) {
    console.error("Firebase initialization failed.", e);
    document.body.innerHTML = `<div class="p-8 text-center bg-red-100 text-red-800"><h1 class="font-bold text-2xl">Firebase 設定錯誤</h1><p class="mt-2">請在程式碼中填入您自己的 Firebase 設定後再試一次。</p></div>`;
}

export { app, auth, db, storage, secondaryAuth };
