/**
 * 簡化版系統監控模組
 * 用於測試系統監控功能
 */

class SimpleSystemMonitor {
    constructor() {
        this.isMonitoring = false;
        this.updateInterval = null;
        this.logger = new SystemLogger();
        this.cache = new SystemCache();
        this.network = new NetworkManager();
        
        // 模擬數據
        this.systemData = {
            status: 'offline',
            networkStatus: 'unknown',
            responseTime: 0,
            onlineUsers: 0,
            cpuUsage: 0,
            memoryUsage: 0,
            diskUsage: 0,
            networkLatency: 0,
            bandwidthUsage: 0,
            lastUpdate: null
        };
        
        this.init();
    }

    async init() {
        try {
            this.logger.info('簡化系統監控模組初始化開始');
            
            // 檢查依賴模組
            if (!this.logger) {
                throw new Error('Logger 模組未正確初始化');
            }
            
            if (!this.cache) {
                throw new Error('Cache 模組未正確初始化');
            }
            
            if (!this.network) {
                throw new Error('Network 模組未正確初始化');
            }
            
            this.logger.info('所有依賴模組檢查完成');
            
            // 載入快取數據
            const cachedData = this.cache.get('system_data');
            if (cachedData) {
                this.systemData = { ...this.systemData, ...cachedData };
                this.logger.info('從快取載入系統數據');
            }
            
            // 測試網路連線
            await this.testNetworkConnection();
            
            this.logger.info('簡化系統監控模組初始化完成');
            
        } catch (error) {
            this.logger.error('簡化系統監控模組初始化失敗:', error);
            throw error;
        }
    }

    async testNetworkConnection() {
        try {
            this.logger.info('開始網路連線測試');
            
            const startTime = Date.now();
            const isConnected = await this.network.checkConnectivity();
            const responseTime = Date.now() - startTime;
            
            this.systemData.networkStatus = isConnected ? 'connected' : 'disconnected';
            this.systemData.responseTime = responseTime;
            this.systemData.networkLatency = responseTime;
            
            this.logger.info(`網路連線測試完成: ${isConnected ? '成功' : '失敗'}, 延遲: ${responseTime}ms`);
            
            return isConnected;
            
        } catch (error) {
            this.logger.error('網路連線測試失敗:', error);
            this.systemData.networkStatus = 'error';
            this.systemData.responseTime = 0;
            this.systemData.networkLatency = 0;
            return false;
        }
    }

    startMonitoring() {
        if (this.isMonitoring) {
            this.logger.warn('系統監控已在運行中');
            return;
        }

        try {
            this.isMonitoring = true;
            this.logger.info('系統監控已啟動');
            
            // 立即更新一次
            this.updateSystemStatus();
            
            // 設置定時更新
            this.updateInterval = setInterval(() => {
                this.updateSystemStatus();
            }, 10000); // 每10秒更新一次
            
            this.systemData.status = 'online';
            
        } catch (error) {
            this.logger.error('啟動系統監控失敗:', error);
            this.stopMonitoring();
            throw error;
        }
    }

    stopMonitoring() {
        if (!this.isMonitoring) {
            this.logger.warn('系統監控未在運行');
            return;
        }

        try {
            this.isMonitoring = false;
            this.systemData.status = 'offline';
            
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
            
            this.logger.info('系統監控已停止');
            
        } catch (error) {
            this.logger.error('停止系統監控失敗:', error);
        }
    }

    updateSystemStatus() {
        try {
            this.logger.info('開始更新系統狀態');
            
            // 更新網路狀態
            this.testNetworkConnection();
            
            // 模擬系統數據更新
            this.systemData.cpuUsage = Math.floor(Math.random() * 30) + 10; // 10-40%
            this.systemData.memoryUsage = Math.floor(Math.random() * 40) + 20; // 20-60%
            this.systemData.diskUsage = Math.floor(Math.random() * 50) + 30; // 30-80%
            this.systemData.bandwidthUsage = Math.floor(Math.random() * 100) + 10; // 10-110 Mbps
            this.systemData.onlineUsers = Math.floor(Math.random() * 50) + 5; // 5-55 users
            this.systemData.lastUpdate = new Date().toISOString();
            
            // 快取數據
            this.cache.set('system_data', this.systemData, 300); // 快取5分鐘
            
            this.logger.info('系統狀態更新完成', {
                cpu: this.systemData.cpuUsage,
                memory: this.systemData.memoryUsage,
                network: this.systemData.networkStatus,
                users: this.systemData.onlineUsers
            });
            
            // 觸發更新事件
            this.onSystemUpdate();
            
        } catch (error) {
            this.logger.error('更新系統狀態失敗:', error);
        }
    }

    onSystemUpdate() {
        // 觸發系統更新事件
        const event = new CustomEvent('systemUpdate', {
            detail: this.systemData
        });
        document.dispatchEvent(event);
    }

    getSystemData() {
        return { ...this.systemData };
    }

    getNetworkStatus() {
        return {
            status: this.systemData.networkStatus,
            latency: this.systemData.networkLatency,
            responseTime: this.systemData.responseTime,
            bandwidth: this.systemData.bandwidthUsage
        };
    }

    getPerformanceData() {
        return {
            cpu: this.systemData.cpuUsage,
            memory: this.systemData.memoryUsage,
            disk: this.systemData.diskUsage,
            lastUpdate: this.systemData.lastUpdate
        };
    }

    // 靜態方法，用於快速測試
    static async quickTest() {
        try {
            console.log('🚀 開始系統監控快速測試...');
            
            const monitor = new SimpleSystemMonitor();
            
            // 等待初始化完成
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 啟動監控
            monitor.startMonitoring();
            
            // 測試數據獲取
            const systemData = monitor.getSystemData();
            const networkStatus = monitor.getNetworkStatus();
            const performanceData = monitor.getPerformanceData();
            
            console.log('✅ 系統數據:', systemData);
            console.log('📡 網路狀態:', networkStatus);
            console.log('⚡ 效能數據:', performanceData);
            
            // 5秒後停止監控
            setTimeout(() => {
                monitor.stopMonitoring();
                console.log('🛑 系統監控測試完成');
            }, 5000);
            
            return {
                success: true,
                systemData,
                networkStatus,
                performanceData
            };
            
        } catch (error) {
            console.error('❌ 系統監控測試失敗:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// 簡化的日誌器類別
class SystemLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 100;
    }

    log(level, message, data = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data
        };
        
        this.logs.push(logEntry);
        
        // 保持日誌數量限制
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // 輸出到控制台
        console.log(`[${level.toUpperCase()}] ${message}`, data || '');
        
        // 觸發日誌事件
        const event = new CustomEvent('systemLog', {
            detail: logEntry
        });
        document.dispatchEvent(event);
    }

    info(message, data) {
        this.log('info', message, data);
    }

    success(message, data) {
        this.log('success', message, data);
    }

    warn(message, data) {
        this.log('warn', message, data);
    }

    error(message, data) {
        this.log('error', message, data);
    }

    getLogs() {
        return [...this.logs];
    }

    clearLogs() {
        this.logs = [];
        this.log('info', '日誌已清除');
    }
}

// 簡化的快取管理器
class SystemCache {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 300; // 5分鐘
    }

    set(key, value, ttl = this.defaultTTL) {
        const expiresAt = Date.now() + (ttl * 1000);
        this.cache.set(key, {
            value,
            expiresAt
        });
    }

    get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            return null;
        }
        
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }

    delete(key) {
        return this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }

    has(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            return false;
        }
        
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return false;
        }
        
        return true;
    }
}

// 簡化的網路管理器
class NetworkManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.lastCheck = null;
        
        // 監聽網路狀態變化
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 網路連線已恢復');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('❌ 網路連線已中斷');
        });
    }

    async checkConnectivity() {
        try {
            // 測試本地連線
            const response = await fetch('/favicon.ico', {
                method: 'HEAD',
                cache: 'no-cache',
                timeout: 5000
            });
            
            this.isOnline = response.ok;
            this.lastCheck = new Date().toISOString();
            
            return this.isOnline;
            
        } catch (error) {
            this.isOnline = false;
            this.lastCheck = new Date().toISOString();
            return false;
        }
    }

    async fetchWithRetry(url, options = {}, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(url, {
                    ...options,
                    timeout: 10000
                });
                
                if (response.ok) {
                    return response;
                }
                
                if (i === maxRetries - 1) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                // 等待後重試
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                
            } catch (error) {
                if (i === maxRetries - 1) {
                    throw error;
                }
                
                // 等待後重試
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }
}

// 導出類別
export { SimpleSystemMonitor, SystemLogger, SystemCache, NetworkManager };

// 全域可用
window.SimpleSystemMonitor = SimpleSystemMonitor;
window.SystemLogger = SystemLogger;
window.SystemCache = SystemCache;
window.NetworkManager = NetworkManager;