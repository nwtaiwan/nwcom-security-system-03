/**
 * 西北保全勤務管理系統 - 核心配置
 * 系統版本: v0.3.0
 * 最後更新: 2024
 */

// 系統配置
export const SYSTEM_CONFIG = {
    // 版本資訊
    VERSION: '0.3.0',
    
    // Firebase 配置
    FIREBASE_CONFIG: {
        apiKey: "AIzaSyARZNcyxLDUaC0xET4mfQw8sHLGzO8jNJE",
        authDomain: "nwcom-security-system-01.firebaseapp.com",
        projectId: "nwcom-security-system-01",
        storageBucket: "nwcom-security-system-01.firebasestorage.app",
        messagingSenderId: "757708581539",
        appId: "1:757708581539:web:30a6b947e37a6b81f3ed16",
        measurementId: "G-X2TSTPJHHG"
    },
    
    // 系統設定
    SETTINGS: {
        // 登入相關
        LOGIN: {
            SESSION_TIMEOUT: 3600000, // 1小時 (毫秒)
            MAX_LOGIN_ATTEMPTS: 5,
            LOCKOUT_DURATION: 900000, // 15分鐘 (毫秒)
            PASSWORD_MIN_LENGTH: 8,
            PASSWORD_REQUIRE_SPECIAL: true,
            PASSWORD_REQUIRE_UPPERCASE: true,
            PASSWORD_REQUIRE_NUMBER: true
        },
        
        // 定位相關
        LOCATION: {
            UPDATE_INTERVAL: 30000, // 30秒更新一次位置
            MIN_DISTANCE: 50, // 最小移動距離(公尺)
            GPS_TIMEOUT: 10000, // GPS定位超時時間(毫秒)
            ALLOW_OFFSITE_CHECKIN: false // 是否允許離站打卡
        },
        
        // 勤務相關
        SCHEDULE: {
            SHIFT_CHANGE_BUFFER: 15, // 換班緩衝時間(分鐘)
            MAX_OVERTIME_HOURS: 12, // 最大加班時數
            MIN_REST_HOURS: 8, // 最小休息時間(小時)
            ALLOW_CONSECUTIVE_SHIFTS: false // 是否允許連續班次
        },
        
        // 休假相關
        LEAVE: {
            MIN_NOTICE_DAYS: 3, // 最小提前申請天數
            MAX_CONSECUTIVE_DAYS: 14, // 最大連續休假天數
            ALLOW_EMERGENCY_LEAVE: true, // 是否允許緊急休假
            EMERGENCY_LEAVE_MAX_DAYS: 3 // 緊急休假最大天數
        },
        
        // 通知相關
        NOTIFICATIONS: {
            ENABLE_PUSH: true,
            ENABLE_EMAIL: true,
            ENABLE_SMS: false,
            CHECK_INTERVAL: 60000 // 1分鐘檢查一次
        }
    },
    
    // API 端點配置
    API_ENDPOINTS: {
        // 地圖相關
        MAPS: {
            GEOCODING: 'https://maps.googleapis.com/maps/api/geocode/json',
            DISTANCE_MATRIX: 'https://maps.googleapis.com/maps/api/distancematrix/json',
            PLACES: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json'
        },
        
        // 天氣相關
        WEATHER: {
            CURRENT: 'https://api.openweathermap.org/data/2.5/weather',
            FORECAST: 'https://api.openweathermap.org/data/2.5/forecast'
        },
        
        // 簡訊服務
        SMS: {
            SEND: 'https://api.sms-service.com/send',
            STATUS: 'https://api.sms-service.com/status'
        }
    },
    
    // 權限角色配置
    ROLES: {
        SYSTEM_ADMIN: {
            name: '系統管理員',
            level: 4,
            permissions: ['all']
        },
        SENIOR_MANAGER: {
            name: '高階主管',
            level: 3,
            permissions: [
                'view_dashboard', 'manage_community', 'view_schedule', 
                'manage_leave', 'view_records', 'assign_tasks', 
                'view_reports', 'view_location'
            ]
        },
        JUNIOR_MANAGER: {
            name: '初階主管',
            level: 2,
            permissions: [
                'view_dashboard', 'view_schedule', 'manage_leave',
                'view_records', 'assign_tasks', 'view_reports', 'view_location'
            ]
        },
        STAFF: {
            name: '勤務人員',
            level: 1,
            permissions: [
                'view_dashboard', 'request_leave', 'view_location'
            ]
        }
    },
    
    // 導航配置
    NAVIGATION: {
        system_admin: ['dashboard', 'users', 'community', 'schedule', 'leave', 'records', 'tasks', 'reports', 'location', 'settings'],
        senior_manager: ['dashboard', 'community', 'schedule', 'leave', 'records', 'tasks', 'reports', 'location'],
        junior_manager: ['dashboard', 'schedule', 'leave', 'records', 'tasks', 'reports', 'location'],
        staff: ['dashboard', 'leave', 'location']
    },
    
    // 錯誤訊息配置
    ERROR_MESSAGES: {
        NETWORK_ERROR: '網路連線異常，請檢查網路狀態',
        PERMISSION_DENIED: '權限不足，無法執行此操作',
        INVALID_CREDENTIALS: '帳號或密碼錯誤',
        ACCOUNT_LOCKED: '帳號已鎖定，請聯繫管理員',
        SESSION_EXPIRED: '登入逾時，請重新登入',
        DATA_NOT_FOUND: '查無資料',
        OPERATION_FAILED: '操作失敗，請稍後再試',
        VALIDATION_ERROR: '資料驗證失敗',
        SYSTEM_MAINTENANCE: '系統維護中，請稍後再試'
    },
    
    // 成功訊息配置
    SUCCESS_MESSAGES: {
        LOGIN_SUCCESS: '登入成功',
        LOGOUT_SUCCESS: '登出成功',
        SAVE_SUCCESS: '儲存成功',
        DELETE_SUCCESS: '刪除成功',
        UPDATE_SUCCESS: '更新成功',
        OPERATION_SUCCESS: '操作成功'
    }
};

// 環境配置
export const ENVIRONMENT = {
    DEVELOPMENT: {
        DEBUG: true,
        LOG_LEVEL: 'debug',
        MOCK_DATA: true
    },
    PRODUCTION: {
        DEBUG: false,
        LOG_LEVEL: 'error',
        MOCK_DATA: false
    }
};

// 匯出當前環境配置
export const CURRENT_ENV = ENVIRONMENT.DEVELOPMENT;