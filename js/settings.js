import { db } from './firebase.js';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { showCustomAlert, showCustomConfirm, showLoader, hideLoader } from './utils.js';

let systemSettings = { roles: [], jobTitles: [], certifications: [], areas: [] };
let settingsPromiseResolver;
const settingsPromise = new Promise(resolve => {
    settingsPromiseResolver = resolve;
});


const settingsConfig = {
    roles: { listElId: 'roles-list', addBtnId: 'add-role-btn', name: '角色' },
    jobTitles: { listElId: 'job-titles-list', addBtnId: 'add-job-title-btn', name: '職稱' },
    certifications: { listElId: 'certifications-list', addBtnId: 'add-certification-btn', name: '專業證照' },
    areas: { listElId: 'areas-list', addBtnId: 'add-area-btn', name: '區域' }
};

function renderAllSettingsLists() {
    Object.keys(settingsConfig).forEach(category => {
        const config = settingsConfig[category];
        const listEl = document.getElementById(config.listElId);
        if (!listEl) return;

        const items = systemSettings[category] || [];
        listEl.innerHTML = '';
        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center bg-white p-2 rounded shadow-xs';
            li.innerHTML = `
                <span class="text-sm">${item}</span>
                <div>
                    <button data-category="${category}" data-value="${item}" class="edit-setting-btn text-blue-500 hover:text-blue-700 text-xs mr-2">修改</button>
                    <button data-category="${category}" data-value="${item}" class="delete-setting-btn text-red-500 hover:text-red-700 text-xs">刪除</button>
                </div>
            `;
            listEl.appendChild(li);
        });
    });
}

function listenToSystemSettings() {
    const settingsRef = doc(db, "system_settings", "account_config");
    return onSnapshot(settingsRef, 
        async (docSnap) => {
            if (docSnap.exists()) {
                systemSettings = docSnap.data();
            } else {
                const defaultSettings = {
                    roles: ['系統管理員', '高階主管', '初階主管', '勤務人員'],
                    jobTitles: ['日班保全', '日機保全', '夜班保全', '夜機保全', '行政祕書', '財務秘書', '吧檯秘書', '總幹事', '副總幹事', '督導', '課長', '襄理', '經理', '處長', '協理', '特助'],
                    certifications: ['急救證照', '職業安全衛生業務主管證照', '職業安全衛生管理員證照', '防火管理人證照'],
                    areas: ['台北', '新北', '桃園']
                };
                try {
                    await setDoc(settingsRef, defaultSettings);
                    systemSettings = defaultSettings;
                } catch (error) {
                    console.error("Failed to create default settings:", error);
                    showCustomAlert("建立預設系統設定失敗。");
                }
            }
            if (settingsPromiseResolver) {
                settingsPromiseResolver();
                settingsPromiseResolver = null; 
            }
            window.dispatchEvent(new Event('settingsUpdated'));
        },
        (error) => {
             console.error("Firestore Permission Denied in listenToSystemSettings:", error);
             showCustomAlert("權限不足，無法讀取系統設定。請聯繫系統管理員檢查 Firestore 安全規則。");
        }
    );
}

async function initSettingsPage() {
    await settingsPromise;
    renderAllSettingsLists();
    window.addEventListener('settingsUpdated', renderAllSettingsLists);

    Object.entries(settingsConfig).forEach(([category, config]) => {
        const addBtn = document.getElementById(config.addBtnId);
        const listEl = document.getElementById(config.listElId);

        if(addBtn) {
            addBtn.addEventListener('click', async () => {
                const newValue = prompt(`請輸入要新增的${config.name}:`);
                if (newValue && newValue.trim()) {
                    showLoader();
                    try {
                       await updateDoc(doc(db, "system_settings", "account_config"), { [category]: arrayUnion(newValue.trim()) });
                    } catch(e) { showCustomAlert('新增失敗'); } finally { hideLoader(); }
                }
            });
        }
        
        if(listEl) {
            listEl.addEventListener('click', async (e) => {
                const { classList, dataset } = e.target;
                const { category, value } = dataset;
                if (!category || !value) return;

                if (classList.contains('delete-setting-btn')) {
                    if (await showCustomConfirm(`確定要刪除 "${value}" 嗎?`)) {
                        showLoader();
                        try {
                            await updateDoc(doc(db, "system_settings", "account_config"), { [category]: arrayRemove(value) });
                        } catch(e) { showCustomAlert('刪除失敗'); } finally { hideLoader(); }
                    }
                } else if (classList.contains('edit-setting-btn')) {
                    const newValue = prompt('修改內容:', value);
                    if (newValue && newValue.trim() && newValue !== value) {
                        const currentItems = [...(systemSettings[category] || [])];
                        const itemIndex = currentItems.indexOf(value);
                        if (itemIndex > -1) {
                            currentItems[itemIndex] = newValue.trim();
                            showLoader();
                            try {
                                await updateDoc(doc(db, "system_settings", "account_config"), { [category]: currentItems });
                            } catch(e) { showCustomAlert('更新失敗'); } finally { hideLoader(); }
                        }
                    }
                }
            });
        }
    });
    
    const subTabAccountSettingsBtn = document.getElementById('sub-tab-account-settings');
    const subTabCommunitySettingsBtn = document.getElementById('sub-tab-community-settings');
    const accountSettingsContent = document.getElementById('account-settings-content');
    const communitySettingsContent = document.getElementById('community-settings-content');
    
    function switchSettingsTab(tab) {
        accountSettingsContent.classList.add('hidden');
        communitySettingsContent.classList.add('hidden');
        subTabAccountSettingsBtn.classList.remove('active');
        subTabCommunitySettingsBtn.classList.remove('active');
        
        if (tab === 'account') {
            accountSettingsContent.classList.remove('hidden');
            subTabAccountSettingsBtn.classList.add('active');
        } else if (tab === 'community') {
            communitySettingsContent.classList.remove('hidden');
            subTabCommunitySettingsBtn.classList.add('active');
        }
    }
    subTabAccountSettingsBtn.addEventListener('click', () => switchSettingsTab('account'));
    subTabCommunitySettingsBtn.addEventListener('click', () => switchSettingsTab('community'));
    
    switchSettingsTab('account');
}

export { initSettingsPage, listenToSystemSettings, systemSettings, settingsPromise };
