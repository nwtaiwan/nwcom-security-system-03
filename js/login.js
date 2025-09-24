import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { showCustomAlert, showLoader, hideLoader } from './utils.js';
import { db, auth } from './firebase.js';

function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    const togglePasswordBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

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

            let deviceId = localStorage.getItem('deviceId');
            if (!deviceId) {
                deviceId = crypto.randomUUID();
                localStorage.setItem('deviceId', deviceId);
            }

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

            if (rememberMeCheckbox.checked) {
                localStorage.setItem('qrSystemUsername', username);
            } else {
                localStorage.removeItem('qrSystemUsername');
            }
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

export { setupLoginForm };