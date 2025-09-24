import { db } from './firebase.js';
import { doc, onSnapshot, setDoc, addDoc, deleteDoc, collection, query } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { showCustomAlert, showCustomConfirm, showLoader, hideLoader } from './utils.js';
import { systemSettings, settingsPromise } from './settings.js';

let allCommunities = [];

function populateCommunityFilterDropdowns() {
    const communityFilterArea = document.getElementById('community-filter-area');
    if (!communityFilterArea) return;
    
    communityFilterArea.innerHTML = '<option value="all">全部區域</option>';
    (systemSettings.areas || []).forEach(area => {
        communityFilterArea.innerHTML += `<option value="${area}">${area}</option>`;
    });
}

function renderCommunityList() {
    const listBody = document.getElementById('communities-list');
    if (!listBody) return;
    listBody.innerHTML = '';
    
    const communitySearchInput = document.getElementById('community-search-input');
    const communityFilterArea = document.getElementById('community-filter-area');

    const searchTerm = communitySearchInput.value.toLowerCase();
    const areaFilter = communityFilterArea.value;

    const filtered = allCommunities.filter(c => {
        const searchMatch = !searchTerm ||
            (c.name && c.name.toLowerCase().includes(searchTerm)) ||
            (c.code && c.code.toLowerCase().includes(searchTerm)) ||
            (c.address && c.address.toLowerCase().includes(searchTerm));
        const areaMatch = areaFilter === 'all' || c.area === areaFilter;
        return searchMatch && areaMatch;
    });

    if (filtered.length === 0) {
        listBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-gray-500">找不到符合條件的社區。</td></tr>`;
        return;
    }

    filtered.forEach(data => {
        const tr = document.createElement('tr');
        const committeeText = (data.committee || []).map(m => `${m.title}: ${m.name}`).join(', ');
        const committeeTitle = (data.committee || []).map(m => `${m.title}: ${m.name} / ${m.phone}`).join('\n');
        const contractText = data.contractStart && data.contractEnd ? `${data.contractStart} ~ ${data.contractEnd}` : '';
        
        tr.innerHTML = `
            <td class="px-2 py-2 whitespace-nowrap">${data.area || ''}</td>
            <td class="px-2 py-2 whitespace-nowrap">${data.code || ''}</td>
            <td class="px-2 py-2 whitespace-nowrap">${data.name || ''}</td>
            <td class="px-2 py-2 whitespace-nowrap">${data.phone || ''}</td>
            <td class="px-2 py-2 whitespace-nowrap">${data.address || ''}</td>
            <td class="px-2 py-2 whitespace-nowrap max-w-xs truncate" title="${committeeTitle}">${committeeText}</td>
            <td class="px-2 py-2 whitespace-nowrap">${contractText}</td>
            <td class="px-2 py-2 whitespace-nowrap max-w-xs truncate" title="${data.remarks || ''}">${data.remarks || ''}</td>
            <td class="px-2 py-2 whitespace-nowrap text-sm font-medium">
                <button data-id="${data.id}" class="edit-community-btn text-blue-600 hover:text-blue-900">編輯</button>
                <button data-id="${data.id}" class="delete-community-btn text-red-600 hover:text-red-900 ml-2">刪除</button>
            </td>
        `;
        listBody.appendChild(tr);
    });
}

function listenToCommunities() {
    const q = query(collection(db, "communities"));
    return onSnapshot(q, (snapshot) => {
        allCommunities = [];
        snapshot.forEach(doc => {
            allCommunities.push({ id: doc.id, ...doc.data() });
        });
        renderCommunityList();
    }, 
    (error) => {
        console.error("Error listening to communities:", error);
        showCustomAlert("無法讀取社區列表，請確認 Firestore 安全規則。");
    });
}

async function initCommunityPage() {
    await settingsPromise;

    const communityModal = document.getElementById('community-modal');
    const showAddCommunityModalBtn = document.getElementById('show-add-community-modal-btn');
    const cancelCommunityModalBtn = document.getElementById('cancel-community-modal-btn');
    const communityForm = document.getElementById('community-form');
    const addCommitteeMemberBtn = document.getElementById('add-committee-member-btn');
    const committeeMembersContainer = document.getElementById('committee-members-container');
    const communitiesList = document.getElementById('communities-list');
    const communitySearchInput = document.getElementById('community-search-input');
    const communityFilterArea = document.getElementById('community-filter-area');

    populateCommunityFilterDropdowns();
    window.addEventListener('settingsUpdated', populateCommunityFilterDropdowns);


    showAddCommunityModalBtn.addEventListener('click', () => {
        communityForm.reset();
        document.getElementById('community-id').value = '';
        committeeMembersContainer.innerHTML = '';
        addCommitteeMemberRow();
        
        const communityAreaSelect = document.getElementById('community-area');
        communityAreaSelect.innerHTML = '<option value="">請選擇區域</option>';
        (systemSettings.areas || []).forEach(area => {
            communityAreaSelect.innerHTML += `<option value="${area}">${area}</option>`;
        });

        communityModal.classList.remove('hidden');
    });

    cancelCommunityModalBtn.addEventListener('click', () => {
        communityModal.classList.add('hidden');
    });

    function addCommitteeMemberRow(member = { title: '', name: '', phone: '' }) {
        const row = document.createElement('div');
        row.className = 'grid grid-cols-4 gap-2 items-center committee-member-row';
        row.innerHTML = `
            <input type="text" value="${member.title}" placeholder="職稱" class="col-span-1 px-2 py-1 border border-gray-300 rounded-md text-sm committee-title">
            <input type="text" value="${member.name}" placeholder="姓名" class="col-span-1 px-2 py-1 border border-gray-300 rounded-md text-sm committee-name">
            <input type="tel" value="${member.phone}" placeholder="手機號碼" class="col-span-1 px-2 py-1 border border-gray-300 rounded-md text-sm committee-phone">
            <button type="button" class="remove-committee-member-btn bg-red-500 text-white px-2 py-1 text-xs rounded hover:bg-red-600">移除</button>
        `;
        committeeMembersContainer.appendChild(row);
        row.querySelector('.remove-committee-member-btn').addEventListener('click', () => row.remove());
    }

    addCommitteeMemberBtn.addEventListener('click', () => addCommitteeMemberRow());

    communityForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoader();

        const committeeMembers = [];
        document.querySelectorAll('.committee-member-row').forEach(row => {
            const title = row.querySelector('.committee-title').value;
            const name = row.querySelector('.committee-name').value;
            const phone = row.querySelector('.committee-phone').value;
            if (title || name || phone) {
               committeeMembers.push({ title, name, phone });
            }
        });

        const communityData = {
            area: document.getElementById('community-area').value,
            code: document.getElementById('community-code').value,
            name: document.getElementById('community-name').value,
            phone: document.getElementById('community-phone').value,
            address: document.getElementById('community-address').value,
            contractStart: document.getElementById('contract-start-date').value,
            contractEnd: document.getElementById('contract-end-date').value,
            remarks: document.getElementById('community-remarks').value,
            committee: committeeMembers
        };
        
        const communityId = document.getElementById('community-id').value;

        try {
            if (communityId) {
                await setDoc(doc(db, 'communities', communityId), communityData);
            } else {
                await addDoc(collection(db, "communities"), communityData);
            }
            showCustomAlert('社區資料已成功儲存！');
            communityModal.classList.add('hidden');
        } catch(error) {
            console.error("Error saving community:", error);
            showCustomAlert(`儲存失敗: ${error.message}`);
        } finally {
            hideLoader();
        }
    });
    
    communitySearchInput.addEventListener('input', renderCommunityList);
    communityFilterArea.addEventListener('change', renderCommunityList);

    communitiesList.addEventListener('click', async (e) => {
         const { classList, dataset } = e.target;
         const { id } = dataset;
         
         if (classList.contains('delete-community-btn')) {
             if (await showCustomConfirm('您確定要刪除這個社區嗎？此操作無法復原。')) {
                 showLoader();
                 try {
                    await deleteDoc(doc(db, 'communities', id));
                    showCustomAlert('社區資料已刪除。');
                 } catch (error) { showCustomAlert('刪除失敗。'); } finally { hideLoader(); }
             }
         } else if (classList.contains('edit-community-btn')) {
             const docSnap = await getDoc(doc(db, 'communities', id));
             if (docSnap.exists()) {
                 const data = docSnap.data();
                 communityForm.reset();
                 document.getElementById('community-id').value = id;
                 
                 const communityAreaSelect = document.getElementById('community-area');
                 communityAreaSelect.innerHTML = '<option value="">請選擇區域</option>';
                 (systemSettings.areas || []).forEach(area => {
                    communityAreaSelect.innerHTML += `<option value="${area}" ${data.area === area ? 'selected' : ''}>${area}</option>`;
                 });
                 
                 document.getElementById('community-code').value = data.code || '';
                 document.getElementById('community-name').value = data.name || '';
                 document.getElementById('community-phone').value = data.phone || '';
                 document.getElementById('community-address').value = data.address || '';
                 document.getElementById('contract-start-date').value = data.contractStart || '';
                 document.getElementById('contract-end-date').value = data.contractEnd || '';
                 document.getElementById('community-remarks').value = data.remarks || '';
                 
                 committeeMembersContainer.innerHTML = '';
                 (data.committee || []).forEach(member => addCommitteeMemberRow(member));
                 
                 communityModal.classList.remove('hidden');
             }
         }
    });
    
    // Initial data load
    listenToCommunities();
}

export { initCommunityPage };

