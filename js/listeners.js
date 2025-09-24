// This module provides a centralized place to manage Firestore listeners.

let activeListeners = [];

// Adds one or more unsubscribe functions to the list.
function addListeners(unsubs) {
    if (Array.isArray(unsubs)) {
        activeListeners.push(...unsubs);
    }
}

// Calls all unsubscribe functions and clears the list.
function clearAllListeners() {
    activeListeners.forEach(unsub => {
        if (typeof unsub === 'function') {
            unsub();
        }
    });
    activeListeners = [];
}

export { addListeners, clearAllListeners };
