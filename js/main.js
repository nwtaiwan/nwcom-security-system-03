import { handleAuthStateChange } from './auth.js';
import { initUsersPage } from './users.js';
import { initCommunityPage } from './community.js';
import { initLocationPage } from './location.js';
import { initSettingsPage } from './settings.js';

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
    const mainLayout = document.getElementById('main-view');
    if (!mainLayout) {
        try {
            const response = await fetch('pages/login.html');
            app.innerHTML = await response.text();
            return 'login';
        } catch (e) {
            app.innerHTML = `<p class="text-center text-red-500">無法載入登入頁面。</p>`;
            return null;
        }
    }
    
    const page = window.location.hash.substring(1) || 'users';
    const mainContentArea = document.getElementById('main-content');
    if (!mainContentArea) return null;

    try {
        const response = await fetch(`pages/${page}.html`);
        if (!response.ok) throw new Error('找不到頁面');
        mainContentArea.innerHTML = await response.text();
        
        // Attach listener AFTER content is loaded
        const menuToggleButton = mainContentArea.querySelector('.menu-toggle-btn');
        if (menuToggleButton) {
            menuToggleButton.addEventListener('click', openSidebar);
        }
        
        switch(page) {
            case 'users': initUsersPage(); break;
            case 'community': initCommunityPage(); break;
            case 'location': initLocationPage(); break;
            case 'settings': initSettingsPage(); break;
        }

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


        return page;
    } catch (error) {
        mainContentArea.innerHTML = `<p class="text-center text-red-500">無法載入頁面: ${error.message}</p>`;
        return null;
    }
}

window.addEventListener('hashchange', router);

document.addEventListener('DOMContentLoaded', () => {
    handleAuthStateChange(router, closeSidebar);
});

