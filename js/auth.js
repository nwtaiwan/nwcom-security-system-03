import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, setDoc, addDoc, collection, serverTimestamp, getDocs, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { showCustomAlert, showLoader, hideLoader } from './utils.js';

// Firebase services are initialized in main.js and passed around or imported
import { db, auth } from './firebase.js';

let currentUser = null;
const roleMap = {
    'system_admin': '系統管理員',
    'senior_manager': '高階主管',
    'junior_manager': '初階主管',
    'staff': '勤務人員'
};

// --- Authentication Logic ---

function setupLoginForm(loginForm) {
    if (!loginForm) return;

    const togglePasswordBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    // Password visibility toggle
    if (togglePasswordBtn && passwordInput) {
        const eyeIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>`;
        const eyeOffIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7 .847 0 1.67.127 2.455.364m0 18.461A10.05 10.05 0 0012 19c2.485 0 4.786-.99 6.437-2.625M12 5a9.955 9.955 0 014.242 1.031" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9a3 3 0 110 6 3 3 0 010-6z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 1l22 22" /></svg>`;
        togglePasswordBtn.innerHTML = eyeIcon;
        togglePasswordBtn.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                togglePasswordBtn.innerHTML = eyeOffIcon;
            } else {
                passwordInput.type = 'password';
                togglePasswordBtn.innerHTML = eyeIcon;
            }
        });
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader();
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const rememberMeCheckbox = document.getElementById('remember-me');
        
        const username = usernameInput.value;
        const password = passwordInput.value;
        const emailForFirebase = `${username}@qrsystem.app`;
        
        try {
            const userCredential = await signInWithEmailAndPassword(auth, emailForFirebase, password);
            const user = userCredential.user;
            
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) throw new Error("找不到對應的使用者資料。");
            const userData = userDoc.data();

            // Device ID logic for login history
            let deviceId = localStorage.getItem('deviceId');
            if (!deviceId) {
                deviceId = crypto.randomUUID();
                localStorage.setItem('deviceId', deviceId);
            }

            // Create Login Log
            const logDocRef = await addDoc(collection(db, "login_logs"), {
                userId: user.uid,
                deviceId: deviceId,
                loginTimestamp: serverTimestamp(),
                logoutTimestamp: null,
                employeeId: userData.employeeId || '',
                fullName: userData.fullName || '',
                status: userData.status || ''
            });
            localStorage.setItem('logDocId', logDocRef.id);

            // Remember me logic
            if (rememberMeCheckbox.checked) {
                localStorage.setItem('qrSystemUsername', username);
            } else {
                localStorage.removeItem('qrSystemUsername');
            }
            // The onAuthStateChanged listener will handle the UI transition
        } catch (error) {
            console.error("Login failed:", error);
            if (error.code && error.code.includes('permission-denied')) {
                showCustomAlert(`登入失敗: 權限不足，無法寫入登入紀錄。請確認 Firestore 安全規則。`);
            } else if (username === 'test' && error.code === 'auth/user-not-found') {
                try {
                   const userCredential = await createUserWithEmailAndPassword(auth, 'test@qrsystem.app', '123456');
                   await setDoc(doc(db, 'users', userCredential.user.uid), { username: 'test', email: userCredential.user.email, role: 'system_admin' });
                   showCustomAlert('測試管理員帳號已建立，請重新登入。');
                } catch (creationError) {
                    showCustomAlert(`測試帳號建立失敗: ${creationError.message}`);
                }
            } else if (error.code === 'auth/invalid-credential') {
                showCustomAlert(`登入失敗: 帳號或密碼錯誤。`);
            } else {
                showCustomAlert(`登入失敗: ${error.message}`);
            }
        } finally {
            hideLoader();
        }
    });
}

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
        // The onAuthStateChanged listener will handle UI cleanup.
        hideLoader();
    }
}

function handleAuthStateChange(router) {
    onAuthStateChanged(auth, async (user) => {
        const appContainer = document.getElementById('app');
        if (user && user.email) {
            // User is signed in.
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                currentUser = { uid: user.uid, ...userDoc.data() };
                
                // Load main layout if it's not already there
                if (!document.getElementById('main-view')) {
                    const response = await fetch('pages/main_layout.html');
                    appContainer.innerHTML = await response.text();
                }

                // Update UI elements in the main layout
                document.getElementById('user-display').textContent = `${currentUser.fullName || currentUser.username} (${roleMap[currentUser.role] || currentUser.role})`;
                document.getElementById('logout-btn').addEventListener('click', handleLogout);
                
                // Setup sidebar toggles
                const leftSidebar = document.getElementById('left-sidebar');
                const sidebarOverlay = document.getElementById('sidebar-overlay');
                const openSidebar = () => { leftSidebar.classList.remove('-translate-x-full'); sidebarOverlay.classList.remove('hidden'); };
                const closeSidebar = () => { leftSidebar.classList.add('-translate-x-full'); sidebarOverlay.classList.add('hidden'); };
                document.querySelectorAll('[id^="menu-toggle-btn"]').forEach(btn => btn.addEventListener('click', openSidebar));
                sidebarOverlay.addEventListener('click', closeSidebar);

                // Run the router to load the correct page content
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
            
            // Re-initialize login form logic
            const loginForm = document.getElementById('login-form');
            const usernameInput = document.getElementById('username');
            const rememberMeCheckbox = document.getElementById('remember-me');
            const savedUsername = localStorage.getItem('qrSystemUsername');
            if (savedUsername) {
                usernameInput.value = savedUsername;
                rememberMeCheckbox.checked = true;
            }
            setupLoginForm(loginForm);
        }
    });
}


export { handleAuthStateChange, currentUser, roleMap };
