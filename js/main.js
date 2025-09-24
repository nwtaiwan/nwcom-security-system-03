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
    // This function will now return an array of unsubscribe functions for the loaded page
    if (window.clearPageListeners) {
        window.clearPageListeners();
    }

    const mainLayout = document.getElementById('main-view');
    if (!mainLayout) {
        try {
            const response = await fetch('pages/login.html');
            app.innerHTML = await response.text();
            return []; // Return empty listeners for login page
        } catch (e) {
            app.innerHTML = `<p class="text-center text-red-500">無法載入登入頁面。</p>`;
            return [];
        }
    }
    
    const page = window.location.hash.substring(1) || 'users';
    const mainContentArea = document.getElementById('main-content');
    if (!mainContentArea) return [];

    try {
        const response = await fetch(`pages/${page}.html`);
        if (!response.ok) throw new Error('找不到頁面');
        mainContentArea.innerHTML = await response.text();
        
        const menuToggleButton = mainContentArea.querySelector('.menu-toggle-btn');
        if (menuToggleButton) {
            menuToggleButton.addEventListener('click', openSidebar);
        }
        
        let listeners = [];
        switch(page) {
            case 'users': listeners = initUsersPage(); break;
            case 'community': listeners = initCommunityPage(); break;
            case 'location': listeners = initLocationPage(); break;
            case 'settings': listeners = await initSettingsPage(); break; 
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

        return listeners; // Return the array of unsubscribe functions
    } catch (error) {
        mainContentArea.innerHTML = `<p class="text-center text-red-500">無法載入頁面: ${error.message}</p>`;
        return [];
    }
}

window.addEventListener('hashchange', router);

document.addEventListener('DOMContentLoaded', () => {
    handleAuthStateChange(router, closeSidebar);
});

