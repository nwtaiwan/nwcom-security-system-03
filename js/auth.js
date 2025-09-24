import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, updateDoc, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { showCustomAlert, showLoader, hideLoader } from './utils.js';
import { db, auth } from './firebase.js';
import { setupLoginForm } from './login.js';
import { listenToSystemSettings } from "./settings.js";
import { clearAllListeners } from "./listeners.js";
import { systemLogger, systemSecurity } from './system.js';
import { notificationManager } from './notification.js';
import { SYSTEM_CONFIG } from './config.js';

let currentUser = null;
let unsubscribeSystemSettings = () => {};
let unsubscribeSession = () => {};

const roleMap = {
    'system_admin': '系統管理員',
    'senior_manager': '高階主管',
    'junior_manager': '初階主管',
    'staff': '勤務人員'
};

const navConfig = {
    system_admin: ['dashboard', 'users', 'community', 'schedule', 'leave', 'records', 'tasks', 'reports', 'location', 'settings', 'system-monitor'],
    senior_manager: ['dashboard', 'community', 'schedule', 'leave', 'records', 'tasks', 'reports', 'location'],
    junior_manager: ['dashboard', 'schedule', 'leave', 'records', 'tasks', 'reports', 'location'],
    staff: ['dashboard', 'leave', 'location']
};

const navItems = {
    dashboard: { href: '#dashboard', text: '儀表板', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>` },
    users: { href: '#users', text: '帳號管理', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" /></svg>` },
    community: { href: '#community', text: '社區管理', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor"><path d="M8 2a1 1 0 00-1 1v1H5a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V5a1 1 0 00-1-1h-2V3a1 1 0 00-1-1H8zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 112 0v2a1 1 0 11-2 0v-2z" /></svg>` },
    schedule: { href: '#schedule', text: '勤務排班', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" /></svg>` },
    leave: { href: '#leave', text: '休假管理', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clip-rule="evenodd" /></svg>` },
    records: { href: '#records', text: '獎懲登錄', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd" /></svg>` },
    tasks: { href: '#tasks', text: '任務指派', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" /></svg>` },
    reports: { href: '#reports', text: '數據報告', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4zM14 8a1 1 0 011-1h2a1 1 0 011 1v8a1 1 0 01-1 1h-2a1 1 0 01-1-1V8z" /></svg>` },
    location: { href: '#location', text: '定位打卡', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 21l-4.95-6.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" /></svg>` },
    settings: { href: '#settings', text: '系統設定', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>` },
    'system-monitor': { href: '#system-monitor', text: '系統監控', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" /></svg>` },
};

async function handleLogout() {
    showLoader();
    // First, stop all active data listeners to prevent permission errors after sign-out.
    clearAllListeners();
    unsubscribeSession();
    unsubscribeSystemSettings();

    try {
        const logDocId = localStorage.getItem('logDocId');
        if (logDocId) {
            const logDocRef = doc(db, 'login_logs', logDocId);
            await updateDoc(logDocRef, { logoutTimestamp: serverTimestamp() });
        }
        if (currentUser && currentUser.uid) {
            systemLogger.info(`使用者 ${currentUser.email} 執行登出操作`);
            
            await updateDoc(doc(db, 'users', currentUser.uid), { loginSessionId: null });
            
            // 發送登出通知
            notificationManager.sendNotification(currentUser.uid, {
                title: '登出成功',
                body: '您已成功登出系統',
                type: 'info'
            });
        }
        await signOut(auth);
        systemLogger.info('使用者成功登出系統');
    } catch (error) {
        systemLogger.error(`登出錯誤: ${error.message}`);
        console.error("Error during logout process:", error);
        showCustomAlert('登出時發生錯誤，但仍會嘗試清除本機登入狀態。');
    } finally {
        localStorage.removeItem('logDocId');
        localStorage.removeItem('loginSessionId');
        hideLoader();
    }
}

export function onAuthStateChange(callback) {
    return onAuthStateChanged(auth, async (user) => {
        // Clear all global and page-specific listeners on any auth state change
        unsubscribeSystemSettings();
        unsubscribeSession();
        clearAllListeners();

        const appContainer = document.getElementById('app');
        if (user && user.email) {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                currentUser = { uid: user.uid, ...userSnap.data() };

                // Load main layout first
                if (!document.getElementById('main-view')) {
                    const response = await fetch('pages/main_layout.html');
                    appContainer.innerHTML = await response.text();
                }
                
                const userDisplay = document.getElementById('user-display');
                const navContainer = document.getElementById('main-nav');
                const logoutBtn = document.getElementById('logout-btn');
                const sidebarOverlay = document.getElementById('sidebar-overlay');

                if (userDisplay && navContainer) {
                    const userRole = currentUser.role || 'staff';
                    userDisplay.textContent = `${currentUser.fullName || currentUser.username} (${roleMap[userRole]})`;
                    
                    const allowedNavs = navConfig[userRole] || [];
                    navContainer.innerHTML = allowedNavs.map(key => {
                        const item = navItems[key];
                        return `<a href="${item.href}" class="nav-btn font-semibold p-3 rounded-lg flex items-center justify-center">${item.icon}<span>${item.text}</span></a>`;
                    }).join('');
                }
                
                if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
                if(sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
                
                // Use event delegation on the nav container
                if (navContainer) {
                    navContainer.addEventListener('click', (e) => {
                        const navBtn = e.target.closest('.nav-btn');
                        if (navBtn) {
                            if (window.innerWidth < 768) {
                                closeSidebar();
                            }
                        }
                    });
                }
                
                // Start session listener for single-device enforcement
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
                
                unsubscribeSystemSettings = listenToSystemSettings();
                
                // Set default page to dashboard after login if no hash is present
                if (window.location.hash === '' || window.location.hash === '#') {
                    window.location.hash = '#dashboard';
                }
                
                await callback(user);

            } else {
                await handleLogout();
            }
        } else {
            if (currentUser) {
                systemLogger.info(`使用者 ${currentUser.email} 已登出`);
            }
            currentUser = null;
            clearAllListeners();
            await callback(user);
        }
    });
}

export { handleAuthStateChange, currentUser, roleMap };
