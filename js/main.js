import { handleAuthStateChange } from './auth.js';
import { initUsersPage } from './users.js';
import { initCommunityPage } from './community.js';
import { initSettingsPage } from './settings.js';
import { initLocationPage } from './location.js';

const app = document.getElementById('app');
const mainContent = document.getElementById('main-content'); // Assume this is part of a layout loaded first

// Simple hash-based router
async function router() {
    // Look for a layout first, if not present, we are likely on the login page.
    const mainLayout = document.getElementById('main-view');
    if (!mainLayout) {
        // Not logged in, show login page. Auth handler will call router again after login.
        try {
            const response = await fetch('pages/login.html');
            app.innerHTML = await response.text();
            return 'login'; // Indicate that the login page was loaded
        } catch (e) {
            app.innerHTML = `<p class="text-center text-red-500">無法載入登入頁面。</p>`;
            return null;
        }
    }
    
    // User is logged in, route to the correct content page
    const page = window.location.hash.substring(1) || 'users'; // Default to users page
    const mainContentArea = document.getElementById('main-content');
    if (!mainContentArea) return null;

    try {
        const response = await fetch(`pages/${page}.html`);
        if (!response.ok) throw new Error('找不到頁面');
        mainContentArea.innerHTML = await response.text();
        
        // After loading content, initialize page-specific scripts
        switch(page) {
            case 'users':
                initUsersPage();
                break;
            case 'community':
                initCommunityPage();
                break;
            case 'location':
                initLocationPage();
                break;
            case 'settings':
                initSettingsPage();
                break;
        }
        return page;
    } catch (error) {
        mainContentArea.innerHTML = `<p class="text-center text-red-500">無法載入頁面: ${error.message}</p>`;
        return null;
    }
}

// Listen for hash changes to navigate
window.addEventListener('hashchange', router);

// Initial load is handled by the auth state listener
document.addEventListener('DOMContentLoaded', () => {
    handleAuthStateChange(router);
});

