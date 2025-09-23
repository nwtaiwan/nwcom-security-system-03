function showLoader() {
    document.getElementById('loader').classList.remove('hidden');
}

function hideLoader() {
    document.getElementById('loader').classList.add('hidden');
}

function showCustomAlert(message, title = '通知') {
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalButtons = document.getElementById('modal-buttons');
    const customModal = document.getElementById('custom-modal');

    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalButtons.innerHTML = `<button id="modal-ok-btn" class="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-1/2 shadow-sm hover:bg-red-700 focus:outline-none">確定</button>`;
    customModal.classList.remove('hidden');
    document.getElementById('modal-ok-btn').onclick = () => customModal.classList.add('hidden');
}

function showCustomConfirm(message, title = '請確認') {
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalButtons = document.getElementById('modal-buttons');
    const customModal = document.getElementById('custom-modal');

    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalButtons.innerHTML = `
        <button id="modal-confirm-btn" class="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-auto shadow-sm hover:bg-red-700 focus:outline-none">確定</button>
        <button id="modal-cancel-btn" class="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md w-auto shadow-sm hover:bg-gray-300 focus:outline-none">取消</button>
    `;
    customModal.classList.remove('hidden');
    return new Promise((resolve) => {
        document.getElementById('modal-confirm-btn').onclick = () => { customModal.classList.add('hidden'); resolve(true); };
        document.getElementById('modal-cancel-btn').onclick = () => { customModal.classList.add('hidden'); resolve(false); };
    });
}

function generateAvatar(name) {
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#34d399', '#2dd4bf', '#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6'];
    const char = name ? name.charAt(0).toUpperCase() : '無';
    const color = colors[Math.floor(Math.random() * colors.length)];
    const bgColor = color.substring(1);
    const r = parseInt(bgColor.substring(0, 2), 16);
    const g = parseInt(bgColor.substring(2, 4), 16);
    const b = parseInt(bgColor.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const textColor = brightness > 125 ? '000000' : 'ffffff';
    return `https://placehold.co/128x128/${bgColor}/${textColor}?text=${encodeURIComponent(char)}&font=noto+sans`;
}


export { showLoader, hideLoader, showCustomAlert, showCustomConfirm, generateAvatar };
