import { handleAuthStateChange } from './auth.js';
import { initUsersPage } from './users.js';
import { initCommunityPage } from './community.js';
import { initLocationPage } from './location.js';
import { initSettingsPage } from './settings.js';
import { initDashboardPage } from './dashboard.js';
import { initSchedulePage } from './schedule.js';
import { initLeavePage } from './leave.js';
import { initRecordsPage } from './records.js';
import { initTasksPage } from './tasks.js';
import { initReportsPage } from './reports.js';
import { addListeners, clearAllListeners } from './listeners.js';

const app = document.getElementById('app');

// --- Sidebar Logic ---
function openSidebar() {
    const leftSidebar = document.getElementById('left-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (leftSidebar && sidebarOverlay) {
        leftSidebar.classList.remove('-translate-x-full');
        sidebarOverlay.classList.remove('hidden');
    }
}

function closeSidebar() {
    const leftSidebar = document.getElementById('left-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (leftSidebar && sidebarOverlay) {
        leftSidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
    }
}

async function router() {
    // 1. Always clear listeners from the previous page
    clearAllListeners();

    const mainLayout = document.getElementById('main-view');
    if (!mainLayout) {
        try {
            const response = await fetch('pages/login.html');
            app.innerHTML = await response.text();
        } catch (e) {
            app.innerHTML = `<p class="text-center text-red-500">無法載入登入頁面。</p>`;
        }
        return;
    }
    
    // Determine the page from the URL hash, default to 'dashboard' for logged-in users
    const page = window.location.hash.substring(1) || 'dashboard';
    const mainContentArea = document.getElementById('main-content');
    if (!mainContentArea) return;

    try {
        const response = await fetch(`pages/${page}.html`);
        if (!response.ok) throw new Error('找不到頁面');
        mainContentArea.innerHTML = await response.text();
        
        const menuToggleButton = mainContentArea.querySelector('.menu-toggle-btn');
        if (menuToggleButton) {
            menuToggleButton.addEventListener('click', openSidebar);
        }
        
        // 2. Initialize the new page and get its listeners
        let newListeners = [];
        switch(page) {
            case 'dashboard': newListeners = initDashboardPage(); break;
            case 'users': newListeners = initUsersPage(); break;
            case 'community': newListeners = initCommunityPage(); break;
            case 'schedule': newListeners = initSchedulePage(); break;
            case 'leave': newListeners = initLeavePage(); break;
            case 'records': newListeners = initRecordsPage(); break;
            case 'tasks': newListeners = initTasksPage(); break;
            case 'reports': newListeners = initReportsPage(); break;
            case 'location': newListeners = initLocationPage(); break;
            case 'settings': newListeners = await initSettingsPage(); break; 
        }
        // 3. Register the new listeners
        addListeners(newListeners); 

        // Update active nav link
        document.querySelectorAll('.nav-btn').forEach(btn => {
            if(btn.href.endsWith(`#${page}`)) {
                btn.classList.add('bg-red-100', 'text-red-600');
                btn.classList.remove('text-gray-600', 'hover:bg-gray-200');
            } else {
                btn.classList.remove('bg-red-100', 'text-red-600');
                btn.classList.add('text-gray-600', 'hover:bg-gray-200');
            }
        });
    } catch (error) {
        mainContentArea.innerHTML = `<p class="text-center text-red-500">無法載入頁面: ${error.message}</p>`;
    }
}

// When the hash changes, we just re-run the router.
window.addEventListener('hashchange', router);

// On initial load, the auth handler will call the router for the first time.
document.addEventListener('DOMContentLoaded', () => {
    handleAuthStateChange(router, closeSidebar);
});
