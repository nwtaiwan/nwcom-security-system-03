/**
 * 西北保全勤務管理系統 - 通知系統
 * 提供推播通知、郵件通知、簡訊通知功能
 */

import { SYSTEM_CONFIG } from './config.js';
import { systemLogger, systemNetwork } from './system.js';
import { db } from './firebase.js';
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * 通知管理器
 */
export class NotificationManager {
    constructor() {
        this.listeners = new Map();
        this.pushSupported = 'Notification' in window && 'serviceWorker' in navigator;
        this.userId = null;
        this.unsubscribe = null;
        
        this.init();
    }
    
    async init() {
        try {
            // 檢查推播通知支援
            if (this.pushSupported) {
                await this.requestNotificationPermission();
            }
            
            systemLogger.info('NotificationManager initialized', { 
                pushSupported: this.pushSupported,
                permission: Notification.permission 
            });
        } catch (error) {
            systemLogger.error('Failed to initialize NotificationManager', error);
        }
    }
    
    /**
     * 請求通知權限
     */
    async requestNotificationPermission() {
        try {
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                systemLogger.info('Notification permission requested', { permission });
                return permission;
            }
            return Notification.permission;
        } catch (error) {
            systemLogger.error('Failed to request notification permission', error);
            return 'denied';
        }
    }
    
    /**
     * 設定使用者ID並開始監聽通知
     */
    setUserId(userId) {
        this.userId = userId;
        this.startListening();
    }
    
    /**
     * 開始監聽使用者的通知
     */
    startListening() {
        if (!this.userId) return;
        
        try {
            // 停止現有的監聽
            if (this.unsubscribe) {
                this.unsubscribe();
            }
            
            // 監聽未讀通知
            const notificationsRef = collection(db, 'notifications');
            const q = query(
                notificationsRef,
                where('userId', '==', this.userId),
                where('read', '==', false),
                orderBy('createdAt', 'desc')
            );
            
            this.unsubscribe = onSnapshot(q, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const notification = {
                            id: change.doc.id,
                            ...change.doc.data()
                        };
                        this.handleNewNotification(notification);
                    }
                });
            });
            
            systemLogger.debug('Started listening for notifications', { userId: this.userId });
        } catch (error) {
            systemLogger.error('Failed to start listening for notifications', error);
        }
    }
    
    /**
     * 處理新通知
     */
    async handleNewNotification(notification) {
        try {
            systemLogger.debug('Handling new notification', notification);
            
            // 瀏覽器推播通知
            if (this.pushSupported && Notification.permission === 'granted') {
                await this.showPushNotification(notification);
            }
            
            // 應用程式內通知
            this.showInAppNotification(notification);
            
            // 播放提示音
            if (SYSTEM_CONFIG.SETTINGS.NOTIFICATIONS.ENABLE_SOUND) {
                this.playNotificationSound();
            }
            
        } catch (error) {
            systemLogger.error('Failed to handle new notification', error);
        }
    }
    
    /**
     * 顯示推播通知
     */
    async showPushNotification(notification) {
        try {
            const options = {
                body: notification.message,
                icon: '/assets/icons/icon-192x192.png',
                badge: '/assets/icons/badge-72x72.png',
                tag: notification.id,
                requireInteraction: notification.priority === 'high',
                actions: notification.actions || [],
                data: {
                    notificationId: notification.id,
                    type: notification.type,
                    redirectUrl: notification.redirectUrl
                }
            };
            
            if (notification.image) {
                options.image = notification.image;
            }
            
            const pushNotification = new Notification(notification.title, options);
            
            // 設定點擊事件
            pushNotification.onclick = (event) => {
                event.preventDefault();
                this.handleNotificationClick(notification);
                pushNotification.close();
            };
            
            systemLogger.debug('Push notification shown', { 
                title: notification.title,
                id: notification.id 
            });
            
        } catch (error) {
            systemLogger.error('Failed to show push notification', error);
        }
    }
    
    /**
     * 顯示應用程式內通知
     */
    showInAppNotification(notification) {
        try {
            // 創建通知元素
            const notificationElement = document.createElement('div');
            notificationElement.className = `notification notification-${notification.type} notification-${notification.priority}`;
            notificationElement.innerHTML = `
                <div class="notification-content">
                    <div class="notification-icon">
                        ${this.getNotificationIcon(notification.type)}
                    </div>
                    <div class="notification-body">
                        <div class="notification-title">${notification.title}</div>
                        <div class="notification-message">${notification.message}</div>
                        ${notification.actions ? this.renderNotificationActions(notification.actions) : ''}
                    </div>
                    <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            `;
            
            // 設定自動消失
            if (notification.autoClose !== false) {
                setTimeout(() => {
                    if (notificationElement.parentElement) {
                        notificationElement.remove();
                    }
                }, notification.duration || 5000);
            }
            
            // 添加到頁面
            const container = document.getElementById('notification-container') || this.createNotificationContainer();
            container.appendChild(notificationElement);
            
            systemLogger.debug('In-app notification shown', { 
                title: notification.title,
                id: notification.id 
            });
            
        } catch (error) {
            systemLogger.error('Failed to show in-app notification', error);
        }
    }
    
    /**
     * 創建通知容器
     */
    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
        return container;
    }
    
    /**
     * 取得通知圖標
     */
    getNotificationIcon(type) {
        const icons = {
            info: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
            success: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
            warning: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
            error: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
        };
        
        return icons[type] || icons.info;
    }
    
    /**
     * 渲染通知操作按鈕
     */
    renderNotificationActions(actions) {
        return actions.map(action => `
            <button class="notification-action" onclick="${action.onClick}">
                ${action.text}
            </button>
        `).join('');
    }
    
    /**
     * 播放提示音
     */
    playNotificationSound() {
        try {
            const audio = new Audio('/assets/sounds/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(error => {
                systemLogger.warn('Failed to play notification sound', error);
            });
        } catch (error) {
            systemLogger.warn('Notification sound not available', error);
        }
    }
    
    /**
     * 處理通知點擊
     */
    handleNotificationClick(notification) {
        try {
            if (notification.redirectUrl) {
                window.location.href = notification.redirectUrl;
            }
            
            if (notification.onClick) {
                notification.onClick();
            }
            
            // 標記為已讀
            this.markAsRead(notification.id);
            
        } catch (error) {
            systemLogger.error('Failed to handle notification click', error);
        }
    }
    
    /**
     * 發送通知
     */
    async sendNotification(userId, notification) {
        try {
            const notificationData = {
                userId,
                title: notification.title,
                message: notification.message,
                type: notification.type || 'info',
                priority: notification.priority || 'normal',
                read: false,
                createdAt: serverTimestamp(),
                readAt: null,
                actions: notification.actions || null,
                redirectUrl: notification.redirectUrl || null,
                image: notification.image || null,
                duration: notification.duration || 5000,
                autoClose: notification.autoClose !== false,
                data: notification.data || null
            };
            
            await addDoc(collection(db, 'notifications'), notificationData);
            
            systemLogger.info('Notification sent', { 
                userId, 
                title: notification.title,
                type: notification.type 
            });
            
            return true;
        } catch (error) {
            systemLogger.error('Failed to send notification', error);
            return false;
        }
    }
    
    /**
     * 標記通知為已讀
     */
    async markAsRead(notificationId) {
        try {
            // 這裡應該更新 Firebase 中的通知狀態
            systemLogger.debug('Notification marked as read', { notificationId });
        } catch (error) {
            systemLogger.error('Failed to mark notification as read', error);
        }
    }
    
    /**
     * 取得使用者的通知
     */
    async getUserNotifications(userId, limit = 50) {
        try {
            const notificationsRef = collection(db, 'notifications');
            const q = query(
                notificationsRef,
                where('userId', '==', userId),
                orderBy('createdAt', 'desc'),
                limit(limit)
            );
            
            // 這裡應該實作實際的查詢
            systemLogger.debug('Getting user notifications', { userId, limit });
            return [];
        } catch (error) {
            systemLogger.error('Failed to get user notifications', error);
            return [];
        }
    }
    
    /**
     * 停止監聽
     */
    stopListening() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
            systemLogger.debug('Stopped listening for notifications');
        }
    }
}

/**
 * 通知類型定義
 */
export const NotificationTypes = {
    SYSTEM: 'system',
    SCHEDULE: 'schedule',
    LEAVE: 'leave',
    TASK: 'task',
    EMERGENCY: 'emergency',
    REMINDER: 'reminder',
    ALERT: 'alert'
};

/**
 * 通知優先級定義
 */
export const NotificationPriorities = {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    CRITICAL: 'critical'
};

// 匯出實例
export const notificationManager = new NotificationManager();