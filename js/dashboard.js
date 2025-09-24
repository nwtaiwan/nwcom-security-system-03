/**
 * 系統儀表板模組
 * 提供系統概況、統計數據、圖表展示等功能
 */

import { collection, query, where, getDocs, onSnapshot, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { db } from './firebase.js';
import { systemLogger, systemCache } from './system.js';
import { notificationManager } from './notification.js';
import { SYSTEM_CONFIG } from './config.js';

class DashboardManager {
    constructor() {
        this.charts = {};
        this.listeners = [];
        this.updateInterval = null;
        this.cacheKey = 'dashboard_data';
        this.cacheTTL = 300000; // 5分鐘快取
    }

    /**
     * 初始化儀表板
     */
    async init() {
        try {
            systemLogger.info('初始化系統儀表板');
            
            // 載入儀表板數據
            await this.loadDashboardData();
            
            // 綁定事件處理器
            this.bindEventHandlers();
            
            // 設置自動更新
            this.startAutoUpdate();
            
            systemLogger.info('系統儀表板初始化完成');
        } catch (error) {
            systemLogger.error(`儀表板初始化失敗: ${error.message}`);
            throw error;
        }
    }

    /**
     * 載入儀表板數據
     */
    async loadDashboardData() {
        try {
            // 檢查快取
            const cachedData = systemCache.get(this.cacheKey);
            if (cachedData) {
                this.updateDashboardUI(cachedData);
                return cachedData;
            }

            const data = await this.fetchDashboardData();
            
            // 更新UI
            this.updateDashboardUI(data);
            
            // 儲存到快取
            systemCache.set(this.cacheKey, data, this.cacheTTL);
            
            return data;
        } catch (error) {
            systemLogger.error(`載入儀表板數據失敗: ${error.message}`);
            throw error;
        }
    }

    /**
     * 從資料庫獲取儀表板數據
     */
    async fetchDashboardData() {
        const promises = [
            this.getUserStats(),
            this.getLocationStats(),
            this.getScheduleStats(),
            this.getLeaveStats(),
            this.getSystemStats()
        ];

        const results = await Promise.all(promises);
        
        return {
            userStats: results[0],
            locationStats: results[1],
            scheduleStats: results[2],
            leaveStats: results[3],
            systemStats: results[4],
            lastUpdated: new Date()
        };
    }

    /**
     * 獲取用戶統計數據
     */
    async getUserStats() {
        try {
            const usersSnapshot = await getDocs(collection(db, "users"));
            const totalUsers = usersSnapshot.size;
            
            let activeUsers = 0;
            let onlineUsers = 0;
            let byRole = {};
            
            usersSnapshot.forEach(doc => {
                const user = doc.data();
                
                // 活躍用戶（最近30天有登入）
                if (user.lastLogin && this.isRecentlyActive(user.lastLogin.toDate())) {
                    activeUsers++;
                }
                
                // 在線用戶（最近5分鐘有活動）
                if (user.lastActivity && this.isCurrentlyOnline(user.lastActivity.toDate())) {
                    onlineUsers++;
                }
                
                // 按角色分類
                byRole[user.role] = (byRole[user.role] || 0) + 1;
            });
            
            return {
                total: totalUsers,
                active: activeUsers,
                online: onlineUsers,
                byRole: byRole
            };
        } catch (error) {
            systemLogger.error(`獲取用戶統計失敗: ${error.message}`);
            return { total: 0, active: 0, online: 0, byRole: {} };
        }
    }

    /**
     * 獲取定位統計數據
     */
    async getLocationStats() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const locationsQuery = query(
                collection(db, "locations"),
                where("timestamp", ">=", today)
            );
            
            const locationsSnapshot = await getDocs(locationsQuery);
            const totalLocations = locationsSnapshot.size;
            
            let byStatus = {};
            let byType = {};
            
            locationsSnapshot.forEach(doc => {
                const location = doc.data();
                
                byStatus[location.status] = (byStatus[location.status] || 0) + 1;
                byType[location.type] = (byType[location.type] || 0) + 1;
            });
            
            return {
                total: totalLocations,
                byStatus: byStatus,
                byType: byType
            };
        } catch (error) {
            systemLogger.error(`獲取定位統計失敗: ${error.message}`);
            return { total: 0, byStatus: {}, byType: {} };
        }
    }

    /**
     * 獲取勤務統計數據
     */
    async getScheduleStats() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const schedulesQuery = query(
                collection(db, "schedules"),
                where("date", ">=", today)
            );
            
            const schedulesSnapshot = await getDocs(schedulesQuery);
            const totalSchedules = schedulesSnapshot.size;
            
            let completed = 0;
            let pending = 0;
            let byShift = {};
            
            schedulesSnapshot.forEach(doc => {
                const schedule = doc.data();
                
                if (schedule.status === 'completed') {
                    completed++;
                } else if (schedule.status === 'pending') {
                    pending++;
                }
                
                byShift[schedule.shift] = (byShift[schedule.shift] || 0) + 1;
            });
            
            return {
                total: totalSchedules,
                completed: completed,
                pending: pending,
                byShift: byShift
            };
        } catch (error) {
            systemLogger.error(`獲取勤務統計失敗: ${error.message}`);
            return { total: 0, completed: 0, pending: 0, byShift: {} };
        }
    }

    /**
     * 獲取休假統計數據
     */
    async getLeaveStats() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const leavesQuery = query(
                collection(db, "leaves"),
                where("startDate", ">=", today)
            );
            
            const leavesSnapshot = await getDocs(leavesQuery);
            const totalLeaves = leavesSnapshot.size;
            
            let approved = 0;
            let pending = 0;
            let rejected = 0;
            let byType = {};
            
            leavesSnapshot.forEach(doc => {
                const leave = doc.data();
                
                if (leave.status === 'approved') {
                    approved++;
                } else if (leave.status === 'pending') {
                    pending++;
                } else if (leave.status === 'rejected') {
                    rejected++;
                }
                
                byType[leave.type] = (byType[leave.type] || 0) + 1;
            });
            
            return {
                total: totalLeaves,
                approved: approved,
                pending: pending,
                rejected: rejected,
                byType: byType
            };
        } catch (error) {
            systemLogger.error(`獲取休假統計失敗: ${error.message}`);
            return { total: 0, approved: 0, pending: 0, rejected: 0, byType: {} };
        }
    }

    /**
     * 獲取系統統計數據
     */
    async getSystemStats() {
        try {
            return {
                uptime: this.getSystemUptime(),
                responseTime: await this.getAverageResponseTime(),
                errorRate: await this.getErrorRate(),
                lastBackup: await this.getLastBackupTime()
            };
        } catch (error) {
            systemLogger.error(`獲取系統統計失敗: ${error.message}`);
            return {
                uptime: 'N/A',
                responseTime: 0,
                errorRate: 0,
                lastBackup: null
            };
        }
    }

    /**
     * 更新儀表板UI
     */
    updateDashboardUI(data) {
        // 更新用戶統計
        this.updateUserStatsUI(data.userStats);
        
        // 更新定位統計
        this.updateLocationStatsUI(data.locationStats);
        
        // 更新勤務統計
        this.updateScheduleStatsUI(data.scheduleStats);
        
        // 更新休假統計
        this.updateLeaveStatsUI(data.leaveStats);
        
        // 更新系統統計
        this.updateSystemStatsUI(data.systemStats);
        
        // 更新圖表
        this.updateCharts(data);
        
        // 更新最後更新時間
        this.updateLastUpdatedTime(data.lastUpdated);
    }

    /**
     * 更新用戶統計UI
     */
    updateUserStatsUI(stats) {
        const elements = {
            totalUsers: document.getElementById('total-users'),
            activeUsers: document.getElementById('active-users'),
            onlineUsers: document.getElementById('online-users')
        };

        if (elements.totalUsers) elements.totalUsers.textContent = stats.total;
        if (elements.activeUsers) elements.activeUsers.textContent = stats.active;
        if (elements.onlineUsers) elements.onlineUsers.textContent = stats.online;
    }

    /**
     * 更新定位統計UI
     */
    updateLocationStatsUI(stats) {
        const element = document.getElementById('total-locations');
        if (element) element.textContent = stats.total;
    }

    /**
     * 更新勤務統計UI
     */
    updateScheduleStatsUI(stats) {
        const elements = {
            totalSchedules: document.getElementById('total-schedules'),
            completedSchedules: document.getElementById('completed-schedules'),
            pendingSchedules: document.getElementById('pending-schedules')
        };

        if (elements.totalSchedules) elements.totalSchedules.textContent = stats.total;
        if (elements.completedSchedules) elements.completedSchedules.textContent = stats.completed;
        if (elements.pendingSchedules) elements.pendingSchedules.textContent = stats.pending;
    }

    /**
     * 更新休假統計UI
     */
    updateLeaveStatsUI(stats) {
        const elements = {
            totalLeaves: document.getElementById('total-leaves'),
            approvedLeaves: document.getElementById('approved-leaves'),
            pendingLeaves: document.getElementById('pending-leaves')
        };

        if (elements.totalLeaves) elements.totalLeaves.textContent = stats.total;
        if (elements.approvedLeaves) elements.approvedLeaves.textContent = stats.approved;
        if (elements.pendingLeaves) elements.pendingLeaves.textContent = stats.pending;
    }

    /**
     * 更新系統統計UI
     */
    updateSystemStatsUI(stats) {
        const elements = {
            systemUptime: document.getElementById('system-uptime'),
            responseTime: document.getElementById('response-time'),
            errorRate: document.getElementById('error-rate')
        };

        if (elements.systemUptime) elements.systemUptime.textContent = stats.uptime;
        if (elements.responseTime) elements.responseTime.textContent = `${stats.responseTime}ms`;
        if (elements.errorRate) elements.errorRate.textContent = `${stats.errorRate}%`;
    }

    /**
     * 更新圖表
     */
    updateCharts(data) {
        // 用戶角色分佈圖
        this.createPieChart('user-role-chart', data.userStats.byRole, '用戶角色分佈');
        
        // 勤務狀態圖
        this.createBarChart('schedule-status-chart', {
            completed: data.scheduleStats.completed,
            pending: data.scheduleStats.pending
        }, '勤務狀態');
        
        // 休假類型圖
        this.createPieChart('leave-type-chart', data.leaveStats.byType, '休假類型分佈');
    }

    /**
     * 創建餅圖
     */
    createPieChart(canvasId, data, title) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !data || Object.keys(data).length === 0) return;

        const ctx = canvas.getContext('2d');
        const total = Object.values(data).reduce((sum, val) => sum + val, 0);
        
        if (total === 0) return;

        const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];
        let currentAngle = 0;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        Object.entries(data).forEach(([key, value], index) => {
            const sliceAngle = (value / total) * 2 * Math.PI;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = colors[index % colors.length];
            ctx.fill();
            
            // 添加標籤
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius + 20);
            const labelY = centerY + Math.sin(labelAngle) * (radius + 20);
            
            ctx.fillStyle = '#374151';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${key}: ${value}`, labelX, labelY);
            
            currentAngle += sliceAngle;
        });

        // 添加標題
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, centerX, 20);
    }

    /**
     * 創建條形圖
     */
    createBarChart(canvasId, data, title) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !data) return;

        const ctx = canvas.getContext('2d');
        const maxValue = Math.max(...Object.values(data));
        const barWidth = (canvas.width - 100) / Object.keys(data).length;
        const maxBarHeight = canvas.height - 80;
        const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'];

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        Object.entries(data).forEach(([key, value], index) => {
            const barHeight = (value / maxValue) * maxBarHeight;
            const x = 50 + index * barWidth;
            const y = canvas.height - 40 - barHeight;

            // 繪製條形
            ctx.fillStyle = colors[index % colors.length];
            ctx.fillRect(x, y, barWidth - 10, barHeight);

            // 添加數值標籤
            ctx.fillStyle = '#374151';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(value.toString(), x + (barWidth - 10) / 2, y - 5);

            // 添加類別標籤
            ctx.fillText(key, x + (barWidth - 10) / 2, canvas.height - 20);
        });

        // 添加標題
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, canvas.width / 2, 20);
    }

    /**
     * 更新最後更新時間
     */
    updateLastUpdatedTime(time) {
        const element = document.getElementById('last-updated');
        if (element) {
            element.textContent = `最後更新: ${time.toLocaleTimeString()}`;
        }
    }

    /**
     * 綁定事件處理器
     */
    bindEventHandlers() {
        // 手動更新按鈕
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await this.refreshDashboard();
            });
        }

        // 匯出報告按鈕
        const exportBtn = document.getElementById('export-report');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportDashboardReport();
            });
        }
    }

    /**
     * 刷新儀表板
     */
    async refreshDashboard() {
        try {
            systemLogger.info('手動刷新儀表板數據');
            
            // 清除快取
            systemCache.delete(this.cacheKey);
            
            // 重新載入數據
            await this.loadDashboardData();
            
            notificationManager.showInAppNotification({
                title: '儀表板已更新',
                body: '數據已成功刷新',
                type: 'success'
            });
        } catch (error) {
            systemLogger.error(`刷新儀表板失敗: ${error.message}`);
            notificationManager.showInAppNotification({
                title: '更新失敗',
                body: '無法刷新儀表板數據',
                type: 'error'
            });
        }
    }

    /**
     * 匯出儀表板報告
     */
    exportDashboardReport() {
        try {
            const data = systemCache.get(this.cacheKey);
            if (!data) {
                notificationManager.showInAppNotification({
                    title: '匯出失敗',
                    body: '沒有可用的數據',
                    type: 'error'
                });
                return;
            }

            const report = {
                exportTime: new Date().toISOString(),
                data: data,
                summary: {
                    totalUsers: data.userStats.total,
                    activeUsers: data.userStats.active,
                    totalSchedules: data.scheduleStats.total,
                    totalLeaves: data.leaveStats.total
                }
            };

            const blob = new Blob([JSON.stringify(report, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dashboard-report-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            systemLogger.info('儀表板報告已匯出');
            notificationManager.showInAppNotification({
                title: '匯出成功',
                body: '儀表板報告已下載',
                type: 'success'
            });
        } catch (error) {
            systemLogger.error(`匯出儀表板報告失敗: ${error.message}`);
            notificationManager.showInAppNotification({
                title: '匯出失敗',
                body: '無法匯出報告',
                type: 'error'
            });
        }
    }

    /**
     * 設置自動更新
     */
    startAutoUpdate() {
        // 每5分鐘自動更新一次
        this.updateInterval = setInterval(async () => {
            try {
                await this.loadDashboardData();
            } catch (error) {
                systemLogger.error(`自動更新儀表板失敗: ${error.message}`);
            }
        }, 300000);
    }

    /**
     * 停止自動更新
     */
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * 清理資源
     */
    destroy() {
        this.stopAutoUpdate();
        
        // 移除所有監聽器
        this.listeners.forEach(unsubscribe => {
            if (unsubscribe) unsubscribe();
        });
        this.listeners = [];
        
        // 清除快取
        systemCache.delete(this.cacheKey);
        
        systemLogger.info('儀表板管理器已清理');
    }

    // 輔助方法
    isRecentlyActive(lastLoginDate) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return lastLoginDate > thirtyDaysAgo;
    }

    isCurrentlyOnline(lastActivityDate) {
        const fiveMinutesAgo = new Date();
        fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
        return lastActivityDate > fiveMinutesAgo;
    }

    getSystemUptime() {
        // 簡單的系統運行時間計算
        const startTime = new Date('2024-01-01'); // 系統啟動時間
        const now = new Date();
        const uptime = now - startTime;
        const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return `${days}天 ${hours}小時`;
    }

    async getAverageResponseTime() {
        // 模擬回應時間
        return Math.floor(Math.random() * 100) + 50;
    }

    async getErrorRate() {
        // 模擬錯誤率
        return (Math.random() * 2).toFixed(2);
    }

    async getLastBackupTime() {
        // 返回最後備份時間
        return new Date();
    }
}

// 創建全局實例
export const dashboardManager = new DashboardManager();

/**
 * 設置儀表板頁面
 */
export async function setupDashboard(user) {
    try {
        systemLogger.info(`設置儀表板頁面，使用者: ${user.email}`);
        
        // 初始化儀表板管理器
        await dashboardManager.init();
        
        // 設置用戶特定的監聽器
        setupUserSpecificListeners(user);
        
        systemLogger.info('儀表板頁面設置完成');
    } catch (error) {
        systemLogger.error(`設置儀表板頁面失敗: ${error.message}`);
        throw error;
    }
}

/**
 * 設置用戶特定的監聽器
 */
function setupUserSpecificListeners(user) {
    // 監聽用戶相關的實時更新
    // 這裡可以根據用戶角色和權限設置不同的監聽器
}

/**
 * 清理儀表板頁面
 */
export function cleanupDashboard() {
    try {
        systemLogger.info('清理儀表板頁面');
        dashboardManager.destroy();
    } catch (error) {
        systemLogger.error(`清理儀表板頁面失敗: ${error.message}`);
    }
}

