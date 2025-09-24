/**
 * 西北保全勤務管理系統 - 系統工具函數
 * 提供系統層級的公用函數
 */

import { SYSTEM_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES } from './config.js';

/**
 * 系統日誌管理器
 */
export class SystemLogger {
    static log(level, message, data = null) {
        if (!SYSTEM_CONFIG.CURRENT_ENV.DEBUG && level === 'debug') return;
        
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // 控制台輸出
        console[level] || console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
        
        // 儲存到本地儲存（用於除錯）
        if (SYSTEM_CONFIG.CURRENT_ENV.DEBUG) {
            this.saveToLocalStorage(logEntry);
        }
    }
    
    static debug(message, data) { this.log('debug', message, data); }
    static info(message, data) { this.log('info', message, data); }
    static warn(message, data) { this.log('warn', message, data); }
    static error(message, data) { this.log('error', message, data); }
    
    static saveToLocalStorage(logEntry) {
        try {
            const logs = JSON.parse(localStorage.getItem('system_logs') || '[]');
            logs.push(logEntry);
            // 只保留最近100筆日誌
            if (logs.length > 100) logs.shift();
            localStorage.setItem('system_logs', JSON.stringify(logs));
        } catch (e) {
            console.error('Failed to save log to localStorage:', e);
        }
    }
    
    static getLogs(level = null, limit = 50) {
        try {
            let logs = JSON.parse(localStorage.getItem('system_logs') || '[]');
            if (level) {
                logs = logs.filter(log => log.level === level);
            }
            return logs.slice(-limit);
        } catch (e) {
            return [];
        }
    }
    
    static clearLogs() {
        localStorage.removeItem('system_logs');
    }
}

/**
 * 系統驗證器
 */
export class SystemValidator {
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    static validatePhone(phone) {
        const phoneRegex = /^09\d{8}$/;
        return phoneRegex.test(phone);
    }
    
    static validatePassword(password) {
        const config = SYSTEM_CONFIG.SETTINGS.LOGIN;
        
        if (password.length < config.PASSWORD_MIN_LENGTH) {
            return {
                valid: false,
                message: `密碼長度至少需要 ${config.PASSWORD_MIN_LENGTH} 個字元`
            };
        }
        
        if (config.PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
            return {
                valid: false,
                message: '密碼必須包含至少一個大寫英文字母'
            };
        }
        
        if (config.PASSWORD_REQUIRE_NUMBER && !/\d/.test(password)) {
            return {
                valid: false,
                message: '密碼必須包含至少一個數字'
            };
        }
        
        if (config.PASSWORD_REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            return {
                valid: false,
                message: '密碼必須包含至少一個特殊字元'
            };
        }
        
        return { valid: true };
    }
    
    static validateIdNumber(idNumber) {
        // 台灣身分證字號驗證
        const idRegex = /^[A-Z][12]\d{8}$/;
        if (!idRegex.test(idNumber)) return false;
        
        // 驗證檢查碼
        const letters = 'ABCDEFGHJKLMNPQRSTUVXYWZIO';
        const weights = [1, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1];
        
        const letterIndex = letters.indexOf(idNumber[0]);
        if (letterIndex === -1) return false;
        
        const checkSum = (Math.floor(letterIndex / 10) + 1) * 1 + 
                        (letterIndex % 10) * 9 + 
                        parseInt(idNumber[1]) * 8 + 
                        parseInt(idNumber[2]) * 7 + 
                        parseInt(idNumber[3]) * 6 + 
                        parseInt(idNumber[4]) * 5 + 
                        parseInt(idNumber[5]) * 4 + 
                        parseInt(idNumber[6]) * 3 + 
                        parseInt(idNumber[7]) * 2 + 
                        parseInt(idNumber[8]) * 1 + 
                        parseInt(idNumber[9]) * 1;
        
        return checkSum % 10 === 0;
    }
    
    static validateTimeRange(startTime, endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        
        if (start >= end) {
            return {
                valid: false,
                message: '開始時間必須早於結束時間'
            };
        }
        
        const diffHours = (end - start) / (1000 * 60 * 60);
        if (diffHours > 24) {
            return {
                valid: false,
                message: '時間區間不能超過24小時'
            };
        }
        
        return { valid: true };
    }
}

/**
 * 系統快取管理器
 */
export class SystemCache {
    constructor() {
        this.cache = new Map();
        this.timestamps = new Map();
        this.defaultTTL = 5 * 60 * 1000; // 5分鐘
    }
    
    set(key, value, ttl = this.defaultTTL) {
        this.cache.set(key, value);
        this.timestamps.set(key, Date.now() + ttl);
        SystemLogger.debug(`Cache set: ${key}`, { ttl });
    }
    
    get(key) {
        const expiry = this.timestamps.get(key);
        if (!expiry || Date.now() > expiry) {
            this.delete(key);
            SystemLogger.debug(`Cache expired: ${key}`);
            return null;
        }
        SystemLogger.debug(`Cache hit: ${key}`);
        return this.cache.get(key);
    }
    
    delete(key) {
        this.cache.delete(key);
        this.timestamps.delete(key);
        SystemLogger.debug(`Cache deleted: ${key}`);
    }
    
    clear() {
        this.cache.clear();
        this.timestamps.clear();
        SystemLogger.debug('Cache cleared');
    }
    
    has(key) {
        const expiry = this.timestamps.get(key);
        if (!expiry || Date.now() > expiry) {
            this.delete(key);
            return false;
        }
        return true;
    }
}

/**
 * 系統網路管理器
 */
export class SystemNetwork {
    static async checkConnectivity() {
        try {
            const response = await fetch('/favicon.ico', {
                method: 'HEAD',
                cache: 'no-cache',
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            SystemLogger.error('Network connectivity check failed', error);
            return false;
        }
    }
    
    static async fetchWithRetry(url, options = {}, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                SystemLogger.debug(`Fetch attempt ${attempt}/${maxRetries}`, { url });
                const response = await fetch(url, {
                    ...options,
                    signal: AbortSignal.timeout(30000) // 30秒超時
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return response;
            } catch (error) {
                lastError = error;
                SystemLogger.warn(`Fetch attempt ${attempt} failed`, { error: error.message });
                
                if (attempt < maxRetries) {
                    // 指數退避延遲
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        SystemLogger.error('All fetch attempts failed', { url, lastError });
        throw lastError;
    }
}

/**
 * 系統效能監控器
 */
export class SystemPerformance {
    static startMonitoring() {
        if (!SYSTEM_CONFIG.CURRENT_ENV.DEBUG) return;
        
        // 監控頁面載入時間
        window.addEventListener('load', () => {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            SystemLogger.info(`Page load time: ${loadTime}ms`);
        });
        
        // 監控記憶體使用情況
        if (performance.memory) {
            setInterval(() => {
                const memory = performance.memory;
                SystemLogger.debug('Memory usage', {
                    used: Math.round(memory.usedJSHeapSize / 1048576) + ' MB',
                    total: Math.round(memory.totalJSHeapSize / 1048576) + ' MB',
                    limit: Math.round(memory.jsHeapSizeLimit / 1048576) + ' MB'
                });
            }, 30000); // 每30秒檢查一次
        }
    }
}

/**
 * 系統安全工具
 */
export class SystemSecurity {
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        // 移除潛在的XSS攻擊代碼
        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]+>/g, '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
    
    static generateSecureId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    static hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }
}

// 匯出實例
export const systemCache = new SystemCache();
export const systemLogger = SystemLogger;
export const systemValidator = SystemValidator;
export const systemNetwork = SystemNetwork;
export const systemPerformance = SystemPerformance;
export const systemSecurity = SystemSecurity;