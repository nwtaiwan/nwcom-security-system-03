import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { showCustomAlert, showLoader, hideLoader } from './utils.js';
import { db, auth } from './firebase.js';
import { setupLoginForm } from './login.js';

let currentUser = null;
const roleMap = {
    'system_admin': '系統管理員',
    'senior_manager': '高階主管',
    'junior_manager': '初階主管',
    'staff': '勤務人員'
};

async function handleLogout() {
    showLoader();
    try {
        const logDocId = localStorage.getItem('logDocId');
        if (logDocId) {
            const logDocRef = doc(db, 'login_logs', logDocId);
            await updateDoc(logDocRef, { logoutTimestamp: serverTimestamp() });
        }
        await signOut(auth);
    } catch (error) {
        console.error("Error during logout process:", error);
        showCustomAlert('登出時發生錯誤，但仍會嘗試清除本機登入狀態。');
    } finally {
        localStorage.removeItem('logDocId');
        hideLoader();
    }
}

function handleAuthStateChange(router, closeSidebar) {
    onAuthStateChanged(auth, async (user) => {
        const appContainer = document.getElementById('app');
        if (user && user.email) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                currentUser = { uid: user.uid, ...userDoc.data() };
                
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
                    btn.addEventListener('click', () => {
                        if (window.innerWidth < 768) {
                            closeSidebar();
                        }
                    });
                });

                await router();
            } else {
                // User exists in Auth, but not in Firestore. Log them out.
                await handleLogout();
            }
        } else {
            // User is signed out.
            currentUser = null;
            const response = await fetch('pages/login.html');
            appContainer.innerHTML = await response.text();
            setupLoginForm();
        }
    });
}


export { handleAuthStateChange, currentUser, roleMap };

