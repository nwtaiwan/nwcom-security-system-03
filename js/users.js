import { db, storage, secondaryAuth } from './firebase.js';
import { getDoc, doc, setDoc, collection, query, onSnapshot, deleteDoc, updateDoc, addDoc, serverTimestamp, getDocs, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { showCustomAlert, showCustomConfirm, showLoader, hideLoader, generateAvatar } from './utils.js';
import { systemSettings, settingsPromise } from './settings.js';

let allUsers = [];

function populateFilterDropdowns() {
    const filterJobTitle = document.getElementById('filter-job-title');
    const filterCertification = document.getElementById('filter-certification');
    if(!filterJobTitle || !filterCertification) return;

    filterJobTitle.innerHTML = '<option value="all">全部職稱</option>';
    (systemSettings.jobTitles || []).forEach(title => {
        filterJobTitle.innerHTML += `<option value="${title}">${title}</option>`;
    });

    filterCertification.innerHTML = '<option value="all">全部證照</option>';
    (systemSettings.certifications || []).forEach(cert => {
        filterCertification.innerHTML += `<option value="${cert}">${cert}</option>`;
    });
}


function renderUserList() {
    const userListTbody = document.getElementById('users-list');
    if (!userListTbody) return;
    userListTbody.innerHTML = '';

    const searchInput = document.getElementById('search-input');
    const filterJobTitle = document.getElementById('filter-job-title');
    const filterCertification = document.getElementById('filter-certification');
    const filterStatus = document.getElementById('filter-status');

    const searchTerm = searchInput.value.toLowerCase();
    const jobTitleFilter = filterJobTitle.value;
    const certificationFilter = filterCertification.value;
    const statusFilter = filterStatus.value;

    const filteredUsers = allUsers.filter(user => {
        const searchMatch = !searchTerm ||
            (user.fullName && user.fullName.toLowerCase().includes(searchTerm)) ||
            (user.employeeId && user.employeeId.toLowerCase().includes(searchTerm)) ||
            (user.phoneNumber && user.phoneNumber.includes(searchTerm));
        
        const jobTitleMatch = jobTitleFilter === 'all' || user.jobTitle === jobTitleFilter;
        const statusMatch = statusFilter === 'all' || user.status === statusFilter;
        const certMatch = certificationFilter === 'all' || (user.certifications && user.certifications.includes(certificationFilter));

        return searchMatch && jobTitleMatch && statusMatch && certMatch;
    });

    if (filteredUsers.length === 0) {
        userListTbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-gray-500">找不到符合條件的使用者。</td></tr>`;
        return;
    }

    filteredUsers.forEach(userData => {
        const tr = document.createElement('tr');
        const certsText = (userData.certifications || []).join(', ');
        const profilePicSrc = userData.profilePic || generateAvatar(userData.fullName);
        tr.innerHTML = `
            <td class="px-2 py-2 whitespace-nowrap">
                <img src="${profilePicSrc}" alt="大頭照" class="w-10 h-10 rounded-full object-cover">
            </td>
            <td class="px-2 py-2 whitespace-nowrap">${userData.employeeId || ''}</td>
            <td class="px-2 py-2 whitespace-nowrap">${userData.fullName || ''}</td>
            <td class="px-2 py-2 whitespace-nowrap">${userData.jobTitle || ''}</td>
            <td class="px-2 py-2 whitespace-nowrap">
                <a href="tel:${userData.phoneNumber || ''}" class="text-blue-600 hover:text-blue-800">${userData.phoneNumber || ''}</a>
            </td>
            <td class="px-2 py-2 whitespace-nowrap max-w-xs truncate" title="${certsText}">${certsText}</td>
            <td class="px-2 py-2 whitespace-nowrap max-w-xs truncate" title="${userData.remarks || ''}">${userData.remarks || ''}</td>
            <td class="px-2 py-2 whitespace-nowrap">${userData.status || ''}</td>
            <td class="px-2 py-2 whitespace-nowrap text-sm font-medium">
                <button data-id="${userData.id}" class="edit-user-btn text-blue-600 hover:text-blue-900">編輯</button>
                <button data-id="${userData.id}" data-username="${userData.username}" class="delete-user-btn text-red-600 hover:text-red-900 ml-2">刪除</button>
            </td>
        `;
        userListTbody.appendChild(tr);
    });
}

function listenToUsers() {
    const q = query(collection(db, "users"));
    return onSnapshot(q, 
        (snapshot) => {
            allUsers = [];
            snapshot.forEach(doc => {
                allUsers.push({ id: doc.id, ...doc.data() });
            });
            renderUserList();
        },
        (error) => {
            console.error("Firestore Permission Denied in listenToUsers:", error);
            showCustomAlert("權限不足，無法讀取使用者列表。請聯繫系統管理員檢查 Firestore 安全規則。");
        }
    );
}

function listenToLoginLogs() {
     const q = query(collection(db, "login_logs"));
     return onSnapshot(q, (snapshot) => {
         const loginHistoryListTbody = document.getElementById('login-history-list');
         if(!loginHistoryListTbody) return;
         
         loginHistoryListTbody.innerHTML = '';
         if (snapshot.empty) {
             loginHistoryListTbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">尚無登入紀錄。</td></tr>`;
             return;
         }

         const logs = [];
         snapshot.forEach(doc => {
             logs.push(doc.data());
         });

         logs.sort((a, b) => (b.loginTimestamp?.seconds || 0) - (a.loginTimestamp?.seconds || 0));
         
         logs.forEach(logData => {
             const tr = document.createElement('tr');
             const loginTime = logData.loginTimestamp ? new Date(logData.loginTimestamp.seconds * 1000).toLocaleString() : 'N/A';
             const logoutTime = logData.logoutTimestamp ? new Date(logData.logoutTimestamp.seconds * 1000).toLocaleString() : '---';
             tr.innerHTML = `
                <td class="px-2 py-2 whitespace-nowrap">${loginTime}</td>
                <td class="px-2 py-2 whitespace-nowrap">${logData.employeeId}</td>
                <td class="px-2 py-2 whitespace-nowrap">${logData.fullName}</td>
                <td class="px-2 py-2 whitespace-nowrap">${logData.status}</td>
                <td class="px-2 py-2 whitespace-nowrap text-xs text-gray-500 truncate" title="${logData.deviceId || ''}">${(logData.deviceId || '').substring(0, 8)}...</td>
                <td class="px-2 py-2 whitespace-nowrap">${logoutTime}</td>
             `;
             loginHistoryListTbody.appendChild(tr);
         });
     }, 
     (error) => {
         console.error("Error listening to login logs:", error);
         showCustomAlert("無法讀取登入紀錄，請確認 Firestore 安全規則。");
     });
}

function initUsersPage() {
    settingsPromise.then(() => {
        // DOM Elements
        const showAddUserModalBtn = document.getElementById('show-add-user-modal-btn');
        const userModal = document.getElementById('user-modal');
        const userForm = document.getElementById('user-form');
        const cancelUserModalBtn = document.getElementById('cancel-user-modal-btn');
        const userModalTitle = document.getElementById('user-modal-title');
        const profilePicInput = document.getElementById('profile-pic');
        const profilePicPreview = document.getElementById('profile-pic-preview');
        const fullNameInput = document.getElementById('full-name');
        const usernameModalInput = document.getElementById('username-modal');
        const passwordModalInput = document.getElementById('password-modal');
        const usersListTbody = document.getElementById('users-list');
        
        // Sub Tab Elements
        const subTabUserListBtn = document.getElementById('sub-tab-user-list');
        const subTabLoginHistoryBtn = document.getElementById('sub-tab-login-history');
        const accountListContent = document.getElementById('account-list-content');
        const loginHistoryContent = document.getElementById('login-history-content');
        
        // Search and Filter Elements
        const searchInput = document.getElementById('search-input');
        const filterJobTitle = document.getElementById('filter-job-title');
        const filterCertification = document.getElementById('filter-certification');
        const filterStatus = document.getElementById('filter-status');

        // --- Sub Tab Logic ---
        function switchUserManagementTab(tab) {
            accountListContent.classList.add('hidden');
            loginHistoryContent.classList.add('hidden');
            subTabUserListBtn.classList.remove('active');
            subTabLoginHistoryBtn.classList.remove('active');
            showAddUserModalBtn.style.display = 'none';

            if (tab === 'userList') {
                accountListContent.classList.remove('hidden');
                subTabUserListBtn.classList.add('active');
                showAddUserModalBtn.style.display = 'block';
            } else if (tab === 'loginHistory') {
                loginHistoryContent.classList.remove('hidden');
                subTabLoginHistoryBtn.classList.add('active');
            }
        }
        subTabUserListBtn.addEventListener('click', () => switchUserManagementTab('userList'));
        subTabLoginHistoryBtn.addEventListener('click', () => switchUserManagementTab('loginHistory'));
        
        populateFilterDropdowns();
        window.addEventListener('settingsUpdated', populateFilterDropdowns);


        // --- Event Listeners for Filtering ---
        searchInput.addEventListener('input', renderUserList);
        filterJobTitle.addEventListener('change', renderUserList);
        filterCertification.addEventListener('change', renderUserList);
        filterStatus.addEventListener('change', renderUserList);

        // --- Modal Logic ---
        function populateDynamicFieldsInModal() {
            const jobTitleSelect = document.getElementById('job-title');
            const certCheckboxes = document.getElementById('certifications-checkboxes');
            jobTitleSelect.innerHTML = '<option value="">未選擇</option>';
            certCheckboxes.innerHTML = '';
            (systemSettings.jobTitles || []).forEach(title => {
                jobTitleSelect.innerHTML += `<option value="${title}">${title}</option>`;
            });
            (systemSettings.certifications || []).forEach(cert => {
                certCheckboxes.innerHTML += `
                    <label class="flex items-center space-x-2 text-sm">
                        <input type="checkbox" name="certifications" value="${cert}" class="rounded border-gray-300 text-red-600 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50">
                        <span>${cert}</span>
                    </label>
                `;
            });
        }

        const nameInputHandler = () => {
            if (!profilePicInput.files[0] && !document.getElementById('user-id').value) {
                profilePicPreview.src = generateAvatar(fullNameInput.value);
            }
        };

        showAddUserModalBtn.addEventListener('click', () => {
            userForm.reset();
            document.getElementById('user-id').value = '';
            userModalTitle.textContent = '新增帳號';
            profilePicPreview.src = generateAvatar('');
            passwordModalInput.placeholder = "請設定密碼";
            passwordModalInput.required = true;
            usernameModalInput.disabled = false;
            populateDynamicFieldsInModal();
            fullNameInput.addEventListener('input', nameInputHandler);
            userModal.classList.remove('hidden');
        });

        cancelUserModalBtn.addEventListener('click', () => {
            fullNameInput.removeEventListener('input', nameInputHandler);
            userModal.classList.add('hidden');
        });
        
        profilePicInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => profilePicPreview.src = e.target.result;
                reader.readAsDataURL(file);
            }
        });

        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showLoader();
            
            const userId = document.getElementById('user-id').value;
            const username = usernameModalInput.value;
            const password = passwordModalInput.value;
            const profilePicFile = profilePicInput.files[0];

            try {
                let authUserId = userId;
                let originalProfilePicURL = '';

                if (userId) {
                    const userDocSnap = await getDoc(doc(db, 'users', userId));
                    if (userDocSnap.exists()) {
                        originalProfilePicURL = userDocSnap.data().profilePic || '';
                    }
                }

                if (!authUserId) {
                    if (!password || password.length < 6) throw new Error('新增使用者時，密碼為必填且長度至少6位。');
                    const email = `${username}@qrsystem.app`;
                    const signInMethods = await fetchSignInMethodsForEmail(auth, email);
                    if (signInMethods.length > 0) throw new Error('錯誤：此登入帳號已被使用。');

                    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
                    authUserId = userCredential.user.uid;
                }
                
                let finalProfilePicURL = originalProfilePicURL;
                if (profilePicFile) {
                    const storageRef = ref(storage, `profile_pictures/${authUserId}`);
                    const snapshot = await uploadBytes(storageRef, profilePicFile);
                    finalProfilePicURL = await getDownloadURL(snapshot.ref);
                }
                
                const selectedCerts = Array.from(document.querySelectorAll('#certifications-checkboxes input:checked')).map(cb => cb.value);
                const userData = {
                    username,
                    role: document.getElementById('user-role').value,
                    employeeId: document.getElementById('employee-id').value,
                    fullName: document.getElementById('full-name').value,
                    phoneNumber: document.getElementById('phone-number').value,
                    address: document.getElementById('address').value,
                    idCardNumber: document.getElementById('id-card-number').value,
                    dob: document.getElementById('dob').value,
                    gender: document.getElementById('gender').value,
                    jobTitle: document.getElementById('job-title').value,
                    status: document.getElementById('status').value,
                    remarks: document.getElementById('remarks').value,
                    certifications: selectedCerts,
                    profilePic: finalProfilePicURL
                };

                await setDoc(doc(db, 'users', authUserId), userData, { merge: true });
                showCustomAlert(`使用者 ${userId ? '更新' : '建立'} 成功！`);
                fullNameInput.removeEventListener('input', nameInputHandler);
                userModal.classList.add('hidden');
            } catch (error) {
                console.error("Error saving user:", error);
                showCustomAlert(`儲存失敗： ${error.message}`);
            } finally {
                hideLoader();
            }
        });

        usersListTbody.addEventListener('click', async (e) => {
            const { classList, dataset } = e.target;
            const { id, username } = dataset;
            
            if (classList.contains('delete-user-btn')) {
                if (await showCustomConfirm(`您確定要刪除帳號 ${username} 嗎？此操作無法復原。`)) {
                    showLoader();
                    try {
                       await deleteDoc(doc(db, "users", id));
                       showCustomAlert('使用者資料已刪除。');
                    } catch(error) {
                        showCustomAlert("刪除使用者資料失敗。");
                    } finally { hideLoader(); }
                }
            } else if (classList.contains('edit-user-btn')) {
                const userDoc = await getDoc(doc(db, "users", id));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    userForm.reset();
                    populateDynamicFieldsInModal();
                    
                    document.getElementById('user-id').value = id;
                    userModalTitle.textContent = '編輯帳號';
                    passwordModalInput.placeholder = "留空則不修改";
                    passwordModalInput.required = false;
                    usernameModalInput.value = userData.username || '';
                    usernameModalInput.disabled = true;

                    document.getElementById('employee-id').value = userData.employeeId || '';
                    fullNameInput.value = userData.fullName || '';
                    document.getElementById('phone-number').value = userData.phoneNumber || '';
                    document.getElementById('address').value = userData.address || '';
                    document.getElementById('id-card-number').value = userData.idCardNumber || '';
                    document.getElementById('dob').value = userData.dob || '';
                    document.getElementById('gender').value = userData.gender || '未指定';
                    document.getElementById('user-role').value = userData.role || 'staff';
                    document.getElementById('job-title').value = userData.jobTitle || '';
                    document.getElementById('status').value = userData.status || '在職';
                    document.getElementById('remarks').value = userData.remarks || '';
                    profilePicPreview.src = userData.profilePic || generateAvatar(userData.fullName);

                    const certs = userData.certifications || [];
                    document.querySelectorAll('#certifications-checkboxes input').forEach(cb => {
                        cb.checked = certs.includes(cb.value);
                    });
                    
                    userModal.classList.remove('hidden');
                }
            }
        });
        
        // Initial data load
        const unsubUsers = listenToUsers();
        const unsubLogs = listenToLoginLogs();

        return [unsubUsers, unsubLogs];
    });
}

export { initUsersPage };
