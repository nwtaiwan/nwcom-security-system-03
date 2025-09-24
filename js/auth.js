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
    if (pageUnsubscribers && pageUnsubscribers.length > 0) {
        pageUnsubscribers.forEach(unsub => unsub());
    }
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
                const roleMap = {
                    'system_admin': '系統管理員',
                    'senior_manager': '高階主管',
                    'junior_manager': '初階主管',
                    'staff': '勤務人員'
                };

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

                document.getElementById('user-display').textContent = `${currentUser.fullName || currentUser.username} (${roleMap[currentUser.role] || currentUser.role})`;
                document.getElementById('logout-btn').addEventListener('click', handleLogout);
                
                const sidebarOverlay = document.getElementById('sidebar-overlay');
                if(sidebarOverlay) {
                    sidebarOverlay.addEventListener('click', closeSidebar);
                }
                
                document.querySelectorAll('.nav-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                         if (window.innerWidth < 768) {
                            closeSidebar();
                        }
                        // When a nav link is clicked, re-run the router to clear old listeners and set up new ones.
                        clearPageListeners();
                        pageUnsubscribers = await router();
                    });
                });
                
                unsubscribeSystemSettings = listenToSystemSettings();
                
                // The router will now load the page and return its listeners
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

export { handleAuthStateChange, currentUser };

