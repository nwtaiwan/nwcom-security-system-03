import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, updateDoc, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { showCustomAlert, showLoader, hideLoader } from './utils.js';
import { db, auth } from './firebase.js';
import { setupLoginForm } from './login.js';
import { listenToSystemSettings } from "./settings.js";

let currentUser = null;
let unsubscribeSystemSettings = () => {};
let unsubscribeSession = () => {};
let pageUnsubscribers = []; // Centralized array for page listeners

function clearPageListeners() {
    pageUnsubscribers.forEach(unsub => unsub());
    pageUnsubscribers = [];
}

async function handleLogout() {
    showLoader();
    try {
        const logDocId = localStorage.getItem('logDocId');
        if (logDocId) {
            const logDocRef = doc(db, 'login_logs', logDocId);
            await updateDoc(logDocRef, { logoutTimestamp: serverTimestamp() });
        }
        if (currentUser && currentUser.uid) {
            await updateDoc(doc(db, 'users', currentUser.uid), { loginSessionId: null });
        }
        await signOut(auth);
    } catch (error) {
        console.error("Error during logout process:", error);
        showCustomAlert('登出時發生錯誤，但仍會嘗試清除本機登入狀態。');
    } finally {
        localStorage.removeItem('logDocId');
        localStorage.removeItem('loginSessionId');
        hideLoader();
    }
}

function handleAuthStateChange(router, closeSidebar) {
    onAuthStateChanged(auth, async (user) => {
        // Clear all listeners on any auth state change
        unsubscribeSystemSettings();
        unsubscribeSession();
        clearPageListeners();

        const appContainer = document.getElementById('app');
        if (user && user.email) {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                currentUser = { uid: user.uid, ...userSnap.data() };

                const localSessionId = localStorage.getItem('loginSessionId');
                unsubscribeSession = onSnapshot(userRef, (userDoc) => {
                    if (userDoc.exists()) {
                        const remoteSessionId = userDoc.data().loginSessionId;
                        if (localSessionId && remoteSessionId && localSessionId !== remoteSessionId) {
                            unsubscribeSession();
                            showCustomAlert('您的帳號已在另一台裝置登入，此裝置將自動登出。', '強制登出');
                            handleLogout();
                        }
                    }
                });
                
                if (!document.getElementById('main-view')) {
                    const response = await fetch('pages/main_layout.html');
                    appContainer.innerHTML = await response.text();
                }
                
                // Moved user display logic inside the router to ensure elements exist
                const sidebarOverlay = document.getElementById('sidebar-overlay');
                if(sidebarOverlay) {
                    sidebarOverlay.addEventListener('click', closeSidebar);
                }
                
                document.querySelectorAll('.nav-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        if (window.innerWidth < 768) {
                            closeSidebar();
                        }
                    });
                });
                
                unsubscribeSystemSettings = listenToSystemSettings();
                
                pageUnsubscribers = await router();

            } else {
                await handleLogout();
            }
        } else {
            currentUser = null;
            // The router will handle showing the login page.
            await router(); 
            setupLoginForm();
        }
    });
}

// Only export the necessary functions and variables
export { handleAuthStateChange, currentUser };
