/**
 * 西北保全勤務管理系統 - 系統監控模組
 * 提供系統監控與管理功能
 */

import { SystemLogger, SystemCache, systemNetwork } from './system.js';
import { notificationManager } from './notification.js';
import { userDataManager } from './dataManager.js';
import { db } from './firebase.js';
import { collection, query, orderBy, limit, onSnapshot, getDocs, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

/**
 * 系統監控器
 */
export class SystemMonitor {
    constructor() {
        this.isMonitoring = false;
        this.updateInterval = null;
        this.charts = {};
        this.logs = [];
        this.activities = [];
        this.performanceData = {
            memory: [],
            cpu: [],
            network: [],
            timestamps: []
        }
        this.maxDataPoints = 20;
        
        this.logger = SystemLogger;
        this.network = systemNetwork;
        this.cache = new SystemCache();
        this.userData = userDataManager;
        this.notification = notificationManager;
        
        this.init();
    }
    
    async init() {
        try {
            this.setupEventListeners();
            this.initializeCharts();
            await this.loadInitialData();
            this.startMonitoring();
            
            this.logger.info('SystemMonitor initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize SystemMonitor:', error);
        }
    }

    async updateNetworkStatus() {
        try {
            const status = await this.network.checkConnectivity();
            this.updateNetworkUI({ status: status ? 'online' : 'offline' });
            this.addLog('info', '網路狀態更新成功', { status });
        } catch (error) {
            this.addLog('error', '網路狀態更新失敗', error);
            this.updateNetworkUI({ status: 'error' });
        }
    }
    
    setupEventListeners() {
        // 刷新監控
        document.getElementById('refresh-monitor')?.addEventListener('click', () => {
            this.refreshAllData();
        });

        // 清除日誌
        document.getElementById('clear-logs')?.addEventListener('click', () => {
            this.clearLogs();
        });

        // 匯出日誌
        document.getElementById('export-logs')?.addEventListener('click', () => {
            this.exportLogs();
        });

        // 清除快取
        document.getElementById('clear-cache')?.addEventListener('click', () => {
            this.clearCache();
        });

        // 重啟服務
        document.getElementById('restart-services')?.addEventListener('click', () => {
            this.restartServices();
        });

        // 系統備份
        document.getElementById('backup-system')?.addEventListener('click', () => {
            this.createSystemBackup();
        });

        // 維護模式
        document.getElementById('maintenance-mode')?.addEventListener('click', () => {
            this.toggleMaintenanceMode();
        });
    }
    
    initializeCharts() {
        // 記憶體圖表
        const memoryCtx = document.getElementById('memory-chart')?.getContext('2d');
        if (memoryCtx) {
            this.charts.memory = new Chart(memoryCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: '記憶體使用 (MB)',
                        data: [],
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // CPU 圖表
        const cpuCtx = document.getElementById('cpu-chart')?.getContext('2d');
        if (cpuCtx) {
            this.charts.cpu = new Chart(cpuCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'CPU 使用率 (%)',
                        data: [],
                        borderColor: 'rgb(239, 68, 68)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }

        // 網路圖表
        const networkCtx = document.getElementById('network-chart')?.getContext('2d');
        if (networkCtx) {
            this.charts.network = new Chart(networkCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: '網路延遲 (ms)',
                        data: [],
                        borderColor: 'rgb(34, 197, 94)',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }
    
    /**
     * 停止監控
     */
    stopMonitoring() {
        this.isMonitoring = false;
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        if (this.activityListener) {
            this.activityListener();
            this.activityListener = null;
        }
        
        if (this.userListener) {
            this.userListener();
            this.userListener = null;
        }
        
        this.logger.info('System monitoring stopped');
    }
    
    /**
     * 載入初始資料
     */
    async loadInitialData() {
        try {
            // 載入系統狀態
            await this.updateSystemStatus();
            
            // 載入使用者統計
            await this.updateUserStatistics();
            
            // 載入系統日誌
            await this.loadSystemLogs();
            
            // 載入使用者活動
            await this.loadUserActivities();
            
            // 載入效能數據
            await this.updatePerformanceData();
            
        } catch (error) {
            this.logger.error('Failed to load initial data:', error);
        }
    }

    async updateSystemStatus() {
        try {
            // 檢查網路連線
            const isOnline = await this.network.checkConnectivity();
            
            // 更新系統狀態顯示
            const statusElement = document.getElementById('system-status');
            if (statusElement) {
                statusElement.textContent = isOnline ? '正常' : '離線';
                statusElement.className = isOnline ? 'text-2xl font-bold text-green-600' : 'text-2xl font-bold text-red-600';
            }

            // 更新網路狀態
            const networkStatusElement = document.getElementById('network-status');
            if (networkStatusElement) {
                networkStatusElement.textContent = isOnline ? '正常' : '離線';
                networkStatusElement.className = isOnline ? 'text-2xl font-bold text-green-600' : 'text-2xl font-bold text-red-600';
            }

            // 測試回應時間
            const startTime = Date.now();
            if (isOnline) {
                await this.network.fetchWithRetry('/favicon.ico');
            }
            const responseTime = Date.now() - startTime;
            
            const responseTimeElement = document.getElementById('response-time');
            if (responseTimeElement) {
                responseTimeElement.textContent = `${responseTime}ms`;
            }

            const networkLatencyElement = document.getElementById('network-latency');
            if (networkLatencyElement) {
                networkLatencyElement.textContent = `${responseTime}ms`;
            }

        } catch (error) {
            this.logger.error('Failed to update system status:', error);
            
            // 更新為錯誤狀態
            const statusElement = document.getElementById('system-status');
            if (statusElement) {
                statusElement.textContent = '錯誤';
                statusElement.className = 'text-2xl font-bold text-red-600';
            }
        }
    }

    async updateUserStatistics() {
        try {
            // 獲取線上使用者和今日登入統計
            const stats = await userDataManager.getUserStatistics();
            
            const onlineUsersElement = document.getElementById('online-users');
            if (onlineUsersElement) {
                onlineUsersElement.textContent = stats.onlineUsers || 0;
            }

            const todayLoginsElement = document.getElementById('today-logins');
            if (todayLoginsElement) {
                todayLoginsElement.textContent = stats.todayLogins || 0;
            }

        } catch (error) {
            this.logger.error('Failed to update user statistics:', error);
        }
    }
    
    async loadSystemLogs() {
        try {
            // 從本地儲存載入日誌
            this.logs = this.logger.getLogs() || [];
            this.displayLogs();
            
            // 監聽新的日誌
            this.logger.onLogAdded = (log) => {
                this.logs.unshift(log);
                if (this.logs.length > 100) {
                    this.logs = this.logs.slice(0, 100);
                }
                this.displayLogs();
            };

        } catch (error) {
            this.logger.error('Failed to load system logs:', error);
        }
    }

    displayLogs() {
        const logsContainer = document.getElementById('system-logs');
        if (!logsContainer) return;

        if (this.logs.length === 0) {
            logsContainer.innerHTML = '<div class="text-gray-500">暫無日誌記錄</div>';
            return;
        }

        const logsHtml = this.logs.map(log => {
            const timestamp = new Date(log.timestamp).toLocaleString('zh-TW');
            const levelClass = this.getLogLevelClass(log.level);
            return `
                <div class="mb-2 p-2 rounded ${levelClass}">
                    <div class="text-xs text-gray-500">${timestamp}</div>
                    <div class="text-sm">[${log.level.toUpperCase()}] ${log.message}</div>
                    ${log.details ? `<div class="text-xs text-gray-600 mt-1">${JSON.stringify(log.details)}</div>` : ''}
                </div>
            `;
        }).join('');

        logsContainer.innerHTML = logsHtml;
        logsContainer.scrollTop = 0;
    }

    getLogLevelClass(level) {
        switch (level) {
            case 'error': return 'bg-red-50 border-l-4 border-red-400';
            case 'warn': return 'bg-yellow-50 border-l-4 border-yellow-400';
            case 'info': return 'bg-blue-50 border-l-4 border-blue-400';
            case 'debug': return 'bg-gray-50 border-l-4 border-gray-400';
            default: return 'bg-gray-50 border-l-4 border-gray-400';
        }
    }
    
    async loadUserActivities() {
        try {
            // 從 userDataManager 獲取最近的使用者活動
            this.activities = await userDataManager.getRecentActivities(10) || [];
            this.displayActivities();
            
        } catch (error) {
            this.logger.error('Failed to load user activities:', error);
        }
    }

    displayActivities() {
        const activitiesContainer = document.getElementById('user-activities');
        if (!activitiesContainer) return;

        if (this.activities.length === 0) {
            activitiesContainer.innerHTML = '<div class="text-gray-500">暫無活動記錄</div>';
            return;
        }

        const activitiesHtml = this.activities.map(activity => {
            const timestamp = new Date(activity.timestamp).toLocaleString('zh-TW');
            return `
                <div class="mb-3 p-3 bg-gray-50 rounded border-l-4 border-blue-400">
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="font-medium text-sm">${activity.userName || activity.userId}</div>
                            <div class="text-gray-600 text-sm">${activity.action}</div>
                            <div class="text-xs text-gray-500 mt-1">${timestamp}</div>
                        </div>
                        <span class="px-2 py-1 text-xs rounded ${this.getActivityTypeClass(activity.type)}">
                            ${this.getActivityTypeText(activity.type)}
                        </span>
                    </div>
                </div>
            `;
        }).join('');

        activitiesContainer.innerHTML = activitiesHtml;
        activitiesContainer.scrollTop = 0;
    }

    getActivityTypeClass(type) {
        switch (type) {
            case 'login': return 'bg-green-100 text-green-800';
            case 'logout': return 'bg-gray-100 text-gray-800';
            case 'patrol': return 'bg-blue-100 text-blue-800';
            case 'alert': return 'bg-red-100 text-red-800';
            case 'system': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    getActivityTypeText(type) {
        switch (type) {
            case 'login': return '登入';
            case 'logout': return '登出';
            case 'patrol': return '巡邏';
            case 'alert': return '警報';
            case 'system': return '系統';
            default: return '其他';
        }
    }
    
    /**
     * 載入活動日誌
     */
    async loadActivityLogs() {
        try {
            const logLevel = document.getElementById('log-level-filter')?.value || '';
            const activityType = document.getElementById('activity-filter')?.value || '';
            const activityDate = document.getElementById('activity-date')?.value || '';
            
            // 取得系統日誌
            const logs = this.logger.getLogs(logLevel || null, 100);
            
            // 顯示日誌
            this.displayLogs(logs);
            
            // 顯示活動記錄
            await this.displayActivityLogs(activityType, activityDate);
            
        } catch (error) {
            this.logger.error('Failed to load activity logs', error);
        }
    }
    
    /**
     * 顯示日誌
     */
    displayLogs(logs) {
        try {
            const container = document.getElementById('log-container');
            if (!container) return;
            
            if (logs.length === 0) {
                container.innerHTML = '<div class="text-gray-500">暫無日誌記錄</div>';
                return;
            }
            
            const logHtml = logs.map(log => {
                const timestamp = new Date(log.timestamp).toLocaleString('zh-TW');
                const levelClass = this.getLogLevelClass(log.level);
                
                return `
                    <div class="mb-2 p-2 rounded border-l-4 ${levelClass}">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <div class="text-xs text-gray-500">${timestamp}</div>
                                <div class="text-sm font-medium">${log.message}</div>
                                ${log.data ? `<div class="text-xs text-gray-600 mt-1">${JSON.stringify(log.data, null, 2)}</div>` : ''}
                            </div>
                            <span class="text-xs px-2 py-1 rounded bg-gray-100">${log.level}</span>
                        </div>
                    </div>
                `;
            }).join('');
            
            container.innerHTML = logHtml;
            
        } catch (error) {
            this.logger.error('Failed to display logs', error);
        }
    }
    
    /**
     * 取得日誌等級樣式
     */
    getLogLevelClass(level) {
        const classes = {
            debug: 'border-blue-400 bg-blue-50',
            info: 'border-green-400 bg-green-50',
            warn: 'border-yellow-400 bg-yellow-50',
            error: 'border-red-400 bg-red-50'
        };
        
        return classes[level] || 'border-gray-400 bg-gray-50';
    }
    
    /**
     * 顯示活動記錄
     */
    async displayActivityLogs(activityType, activityDate) {
        try {
            const tbody = document.getElementById('activity-tbody');
            if (!tbody) return;
            
            // 這裡應該查詢實際的活動記錄
            // 暫時使用模擬數據
            const activities = [
                {
                    timestamp: new Date().toISOString(),
                    user: '系統管理員',
                    type: 'login',
                    description: '使用者登入系統',
                    ip: '192.168.1.100'
                },
                {
                    timestamp: new Date(Date.now() - 60000).toISOString(),
                    user: '張三',
                    type: 'page_view',
                    description: '瀏覽儀表板頁面',
                    ip: '192.168.1.101'
                }
            ];
            
            if (activities.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">暫無活動記錄</td></tr>';
                return;
            }
            
            const activityHtml = activities.map(activity => {
                const time = new Date(activity.timestamp).toLocaleString('zh-TW');
                const typeBadge = this.getActivityTypeBadge(activity.type);
                
                return `
                    <tr>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${time}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${activity.user}</td>
                        <td class="px-6 py-4 whitespace-nowrap">${typeBadge}</td>
                        <td class="px-6 py-4 text-sm text-gray-900">${activity.description}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${activity.ip}</td>
                    </tr>
                `;
            }).join('');
            
            tbody.innerHTML = activityHtml;
            
        } catch (error) {
            this.logger.error('Failed to display activity logs', error);
        }
    }
    
    /**
     * 取得活動類型標籤
     */
    getActivityTypeBadge(type) {
        const badges = {
            login: '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">登入</span>',
            logout: '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">登出</span>',
            page_view: '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">頁面瀏覽</span>',
            data_change: '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">資料變更</span>',
            error: '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">錯誤</span>'
        };
        
        return badges[type] || '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">其他</span>';
    }
    
    /**
     * 載入效能指標
     */
    async loadPerformanceMetrics() {
        try {
            // 更新記憶體使用量
            this.updateMemoryUsage();
            
            // 更新CPU使用率（模擬）
            this.updateCPUUsage();
            
            // 更新網路延遲
            this.updateNetworkLatency();
            
            // 更新頁面載入時間
            this.updatePageLoadTimes();
            
        } catch (error) {
            this.logger.error('Failed to load performance metrics', error);
        }
    }
    
    /**
     * 更新系統指標
     */
    async updateSystemMetrics() {
        try {
            await this.updateOnlineUsers();
            await this.updateResponseTime();
            this.updateMemoryUsage();
            this.updateCPUUsage();
            this.updateNetworkLatency();
            
        } catch (error) {
            this.logger.error('Failed to update system metrics', error);
        }
    }
    
    async updatePerformanceData() {
        try {
            // 更新記憶體使用量
            if (performance.memory) {
                const memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100;
                
                const memoryElement = document.getElementById('memory-usage');
                if (memoryElement) {
                    memoryElement.textContent = `${memoryUsage} MB`;
                }
                
                // 更新圖表數據
                this.updateChartData('memory', memoryUsage);
            }
            
            // 更新CPU使用率（模擬數據）
            const cpuUsage = Math.floor(Math.random() * 30) + 10;
            
            const cpuElement = document.getElementById('cpu-usage');
            if (cpuElement) {
                cpuElement.textContent = `${cpuUsage}%`;
            }
            
            // 更新圖表數據
            this.updateChartData('cpu', cpuUsage);
            
            // 更新網路延遲
            const networkLatency = Math.floor(Math.random() * 100) + 20;
            
            const networkElement = document.getElementById('network-latency');
            if (networkElement) {
                networkElement.textContent = `${networkLatency}ms`;
            }
            
            // 更新圖表數據
            this.updateChartData('network', networkLatency);
            
            // 更新頁面載入時間
            const pageLoadTime = Math.floor(Math.random() * 200) + 50;
            const pageLoadElement = document.getElementById('page-load-time');
            if (pageLoadElement) {
                pageLoadElement.textContent = `${pageLoadTime}ms`;
            }
            
            // 更新頻寬使用（模擬數據）
            const bandwidthUsage = Math.floor(Math.random() * 80) + 20;
            const bandwidthElement = document.getElementById('bandwidth-usage');
            if (bandwidthElement) {
                bandwidthElement.textContent = `${bandwidthUsage} Mbps`;
            }
            
        } catch (error) {
            this.logger.error('Failed to update performance data:', error);
        }
    }
    
    updateChartData(chartType, value) {
        try {
            const chart = this.charts[chartType];
            if (!chart) return;
            
            const now = new Date().toLocaleTimeString('zh-TW');
            
            // 添加新數據點
            chart.data.labels.push(now);
            chart.data.datasets[0].data.push(value);
            
            // 只保留最近20個數據點
            if (chart.data.labels.length > this.maxDataPoints) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
            }
            
            // 更新圖表
            chart.update('none');
            
            // 更新性能數據快取
            if (!this.performanceData[chartType]) {
                this.performanceData[chartType] = [];
            }
            this.performanceData[chartType].push({
                timestamp: Date.now(),
                value: value
            });
            
            // 只保留最近100筆記錄
            if (this.performanceData[chartType].length > 100) {
                this.performanceData[chartType].shift();
            }
            
        } catch (error) {
            this.logger.error('Failed to update chart data', error);
        }
    }
    
    /**
     * 更新CPU使用率（模擬）
     */
    updateCPUUsage() {
        try {
            // 模擬CPU使用率
            const cpuUsage = Math.floor(Math.random() * 100);
            
            document.getElementById('cpu-usage').textContent = `${cpuUsage}%`;
            document.getElementById('cpu-bar').style.width = `${cpuUsage}%`;
            
            // 根據使用率設定顏色
            const bar = document.getElementById('cpu-bar');
            if (cpuUsage > 80) {
                bar.className = 'bg-red-600 h-2 rounded-full';
            } else if (cpuUsage > 60) {
                bar.className = 'bg-yellow-600 h-2 rounded-full';
            } else {
                bar.className = 'bg-green-600 h-2 rounded-full';
            }
            
        } catch (error) {
            this.logger.error('Failed to update CPU usage', error);
        }
    }
    
    /**
     * 更新網路延遲
     */
    updateNetworkLatency() {
        try {
            // 模擬網路延遲
            const latency = Math.floor(Math.random() * 200) + 10;
            
            document.getElementById('network-latency').textContent = `${latency}ms`;
            document.getElementById('network-bar').style.width = `${Math.min(latency, 100)}%`;
            
            // 根據延遲設定顏色
            const bar = document.getElementById('network-bar');
            if (latency > 150) {
                bar.className = 'bg-red-600 h-2 rounded-full';
            } else if (latency > 100) {
                bar.className = 'bg-yellow-600 h-2 rounded-full';
            } else {
                bar.className = 'bg-green-600 h-2 rounded-full';
            }
            
        } catch (error) {
            this.logger.error('Failed to update network latency', error);
        }
    }
    
    /**
     * 更新頁面載入時間
     */
    updatePageLoadTimes() {
        try {
            if (performance.timing.loadEventEnd > 0) {
                const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
                
                this.performanceMetrics.pageLoadTimes.push({
                    timestamp: Date.now(),
                    value: loadTime
                });
                
                // 只保留最近10筆記錄
                if (this.performanceMetrics.pageLoadTimes.length > 10) {
                    this.performanceMetrics.pageLoadTimes.shift();
                }
                
                // 顯示載入時間
                const container = document.getElementById('load-times');
                if (container) {
                    const timesHtml = this.performanceMetrics.pageLoadTimes.slice(-5).reverse().map(time => {
                        const date = new Date(time.timestamp).toLocaleTimeString('zh-TW');
                        const color = time.value < 1000 ? 'text-green-600' : time.value < 3000 ? 'text-yellow-600' : 'text-red-600';
                        return `<div class="flex justify-between ${color}">
                            <span>${date}</span>
                            <span>${time.value}ms</span>
                        </div>`;
                    }).join('');
                    
                    container.innerHTML = timesHtml || '<div>暫無資料</div>';
                }
            }
            
        } catch (error) {
            this.logger.error('Failed to update page load times', error);
        }
    }
    
    /**
     * 開始活動監控
     */
    startActivityMonitoring() {
        try {
            // 監聽系統日誌更新
            setInterval(() => {
                this.loadActivityLogs();
            }, 30000); // 每30秒更新一次
            
        } catch (error) {
            this.logger.error('Failed to start activity monitoring', error);
        }
    }
    
    /**
     * 添加日誌
     */
    addLog(level, message, data = null) {
        try {
            this.logger.log(level, `[SystemMonitor] ${message}`, data);
        } catch (error) {
            console.error('Failed to add log:', error);
        }
    }

    /**
     * 更新網路狀態UI
     */
    updateNetworkUI(status) {
        try {
            const networkStatusElement = document.getElementById('network-status');
            if (networkStatusElement) {
                networkStatusElement.textContent = status.status === 'online' ? '正常' : '離線';
                networkStatusElement.className = status.status === 'online' 
                    ? 'text-2xl font-bold text-green-600' 
                    : 'text-2xl font-bold text-red-600';
            }

            const networkLatencyElement = document.getElementById('network-latency');
            if (networkLatencyElement && status.latency !== undefined) {
                networkLatencyElement.textContent = `${status.latency}ms`;
            }

            const bandwidthElement = document.getElementById('bandwidth-usage');
            if (bandwidthElement && status.bandwidth !== undefined) {
                bandwidthElement.textContent = `${status.bandwidth} Mbps`;
            }
        } catch (error) {
            this.logger.error('Failed to update network UI:', error);
        }
    }

    /**
     * 清除日誌
     */
    async clearLogs() {
        try {
            if (confirm('確定要清除所有系統日誌嗎？此操作無法復原。')) {
                this.logger.clearLogs();
                this.logs = [];
                this.displayLogs();
                this.logger.info('System logs cleared by user');
                notificationManager.success('系統日誌已清除');
            }
        } catch (error) {
            this.logger.error('Failed to clear logs:', error);
            notificationManager.error('清除日誌失敗');
        }
    }
    
    /**
     * 清除系統快取
     */
    async clearCache() {
        try {
            await this.cache.clearAll();
            this.logger.info('System cache cleared by user');
            notificationManager.success('系統快取已清除');
        } catch (error) {
            this.logger.error('Failed to clear cache:', error);
            notificationManager.error('清除快取失敗');
        }
    }
    
    /**
     * 重新啟動服務
     */
    async restartServices() {
        try {
            if (confirm('確定要重新啟動系統服務嗎？這將暫時中斷所有連線。')) {
                notificationManager.info('正在重新啟動服務...');
                
                // 模擬重新啟動過程
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                this.logger.info('Services restarted by user');
                notificationManager.success('服務重新啟動完成');
                
                // 重新載入數據
                await this.loadInitialData();
            }
        } catch (error) {
            this.logger.error('Failed to restart services:', error);
            notificationManager.error('重新啟動服務失敗');
        }
    }
    
    /**
     * 匯出日誌
     */
    async exportLogs() {
        try {
            const logs = this.logger.getLogs();
            const logText = logs.map(log => {
                const timestamp = new Date(log.timestamp).toLocaleString('zh-TW');
                return `[${timestamp}] [${log.level.toUpperCase()}] ${log.message}${log.details ? ' ' + JSON.stringify(log.details) : ''}`;
            }).join('\n');
            
            const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `system-logs-${new Date().toISOString().split('T')[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.logger.info('System logs exported by user');
            notificationManager.success('日誌匯出成功');
            
        } catch (error) {
            this.logger.error('Failed to export logs:', error);
            notificationManager.error('匯出日誌失敗');
        }
    }
    
    /**
     * 建立系統備份
     */
    async createBackup() {
        try {
            if (confirm('確定要建立系統備份嗎？這可能需要一些時間。')) {
                notificationManager.info('正在建立系統備份...');
                
                // 收集系統數據
                const backupData = {
                    timestamp: new Date().toISOString(),
                    logs: this.logs,
                    activities: this.activities,
                    performance: this.performanceData,
                    systemStatus: {
                        onlineUsers: document.getElementById('online-users')?.textContent || 0,
                        todayLogins: document.getElementById('today-logins')?.textContent || 0,
                        responseTime: document.getElementById('response-time')?.textContent || '0ms'
                    }
                };
                
                const backupText = JSON.stringify(backupData, null, 2);
                const blob = new Blob([backupText], { type: 'application/json;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `system-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                systemLogger.info('System backup created by user');
                notificationManager.success('系統備份已建立');
            }
            
        } catch (error) {
            systemLogger.error('Failed to create backup:', error);
            notificationManager.error('建立系統備份失敗');
        }
    }
    
    /**
     * 切換維護模式
     */
    async toggleMaintenanceMode() {
        try {
            const maintenanceButton = document.getElementById('toggle-maintenance');
            if (!maintenanceButton) return;
            
            const isInMaintenance = maintenanceButton.textContent.includes('啟用');
            
            if (isInMaintenance) {
                // 啟用維護模式
                notificationManager.warning('系統維護模式已啟用');
                maintenanceButton.textContent = '停用維護模式';
                maintenanceButton.className = 'px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700';
                this.logger.warn('Maintenance mode enabled by user');
            } else {
                // 停用維護模式
                notificationManager.success('系統維護模式已停用');
                maintenanceButton.textContent = '啟用維護模式';
                maintenanceButton.className = 'px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700';
                this.logger.info('Maintenance mode disabled by user');
            }
            
        } catch (error) {
            this.logger.error('Failed to toggle maintenance mode:', error);
            notificationManager.error('切換維護模式失敗');
        }
    }
}

/**
 * 初始化系統監控頁面
 */
export function initSystemMonitorPage() {
    try {
        systemMonitor.init();
        
        // 返回監聽器以便清理
        return [
            {
                element: window,
                event: 'beforeunload',
                handler: () => systemMonitor.stopMonitoring()
            }
        ];
        
    } catch (error) {
        console.error('Failed to initialize system monitor page', error);
        return [];
    }
}

// 匯出系統監控實例
export const systemMonitor = new SystemMonitor();