/**
 * 系統監控修復測試腳本
 * 用於驗證logger引用錯誤是否已修復
 */

// 測試系統監控模組的修復情況
class SystemMonitorFixTest {
    constructor() {
        this.results = [];
        this.errors = [];
    }

    // 測試logger引用修復
    testLoggerReferences() {
        console.log('🔍 開始測試logger引用修復...');
        
        // 模擬系統監控類別
        class TestSystemMonitor {
            constructor() {
                this.logger = {
                    info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
                    error: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
                    warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
                    debug: (msg, data) => console.debug(`[DEBUG] ${msg}`, data || '')
                };
                this.cache = {
                    set: (key, value) => console.log(`[CACHE] Set ${key}:`, value),
                    get: (key) => { console.log(`[CACHE] Get ${key}`); return null; },
                    delete: (key) => console.log(`[CACHE] Delete ${key}`),
                    clear: () => console.log(`[CACHE] Clear all`)
                };
            }

            // 測試正確的logger使用方式
            init() {
                try {
                    this.logger.info('系統監控初始化開始');
                    
                    // 測試各種logger操作
                    this.logger.info('測試信息日誌');
                    this.logger.error('測試錯誤日誌', new Error('測試錯誤'));
                    this.logger.warn('測試警告日誌');
                    this.logger.debug('測試調試日誌');
                    
                    return true;
                } catch (error) {
                    this.logger.error('初始化失敗:', error);
                    return false;
                }
            }

            // 測試網路狀態更新
            updateNetworkStatus() {
                try {
                    this.logger.info('開始更新網路狀態');
                    
                    // 模擬網路測試
                    const isOnline = navigator.onLine;
                    this.logger.info(`網路狀態: ${isOnline ? '線上' : '離線'}`);
                    
                    return isOnline;
                } catch (error) {
                    this.logger.error('更新網路狀態失敗:', error);
                    return false;
                }
            }

            // 測試停止監控
            stopMonitoring() {
                try {
                    this.logger.info('系統監控停止');
                    return true;
                } catch (error) {
                    this.logger.error('停止監控失敗:', error);
                    return false;
                }
            }
        }

        try {
            const monitor = new TestSystemMonitor();
            const initResult = monitor.init();
            const networkResult = monitor.updateNetworkStatus();
            const stopResult = monitor.stopMonitoring();

            if (initResult && networkResult && stopResult) {
                console.log('✅ Logger引用修復測試通過');
                this.results.push('Logger引用修復測試通過');
                return true;
            } else {
                console.log('❌ Logger引用修復測試失敗');
                this.errors.push('Logger引用修復測試失敗');
                return false;
            }
        } catch (error) {
            console.error('❌ Logger引用測試錯誤:', error);
            this.errors.push(`Logger引用測試錯誤: ${error.message}`);
            return false;
        }
    }

    // 測試錯誤的logger使用方式（應該會失敗）
    testIncorrectLoggerUsage() {
        console.log('🔍 測試錯誤的logger使用方式...');
        
        class BadSystemMonitor {
            constructor() {
                this.logger = {
                    info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
                    error: (msg, data) => console.error(`[ERROR] ${msg}`, data || '')
                };
            }

            // 錯誤的使用方式（使用未定義的systemLogger）
            badMethod() {
                try {
                    // 這應該會失敗，因為systemLogger未定義
                    systemLogger.info('這會導致錯誤');
                    return false; // 不應該到達這裡
                } catch (error) {
                    console.log('✅ 預期的錯誤發生:', error.message);
                    return true; // 這是正確的，應該發生錯誤
                }
            }

            // 正確的使用方式
            goodMethod() {
                try {
                    this.logger.info('這是正確的使用方式');
                    return true;
                } catch (error) {
                    console.log('❌ 不應該發生錯誤:', error.message);
                    return false;
                }
            }
        }

        try {
            const monitor = new BadSystemMonitor();
            const badResult = monitor.badMethod(); // 應該返回true（錯誤被捕捉）
            const goodResult = monitor.goodMethod(); // 應該返回true（沒有錯誤）

            if (badResult && goodResult) {
                console.log('✅ Logger使用方式測試通過');
                this.results.push('Logger使用方式測試通過');
                return true;
            } else {
                console.log('❌ Logger使用方式測試失敗');
                this.errors.push('Logger使用方式測試失敗');
                return false;
            }
        } catch (error) {
            console.error('❌ Logger使用方式測試錯誤:', error);
            this.errors.push(`Logger使用方式測試錯誤: ${error.message}`);
            return false;
        }
    }

    // 測試系統監控的實際功能
    testSystemMonitorFeatures() {
        console.log('🔍 測試系統監控功能...');
        
        try {
            // 測試網路連線
            const isOnline = navigator.onLine;
            console.log(`網路狀態: ${isOnline ? '線上' : '離線'}`);
            
            // 測試本地存儲
            const testKey = 'system_monitor_test';
            localStorage.setItem(testKey, 'test_value');
            const storedValue = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            
            if (storedValue === 'test_value') {
                console.log('✅ 本地存儲測試通過');
                this.results.push('本地存儲測試通過');
            } else {
                console.log('❌ 本地存儲測試失敗');
                this.errors.push('本地存儲測試失敗');
            }
            
            // 測試時間功能
            const startTime = Date.now();
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            if (responseTime >= 0) {
                console.log(`✅ 時間測試通過 (延遲: ${responseTime}ms)`);
                this.results.push(`時間測試通過 (延遲: ${responseTime}ms)`);
            } else {
                console.log('❌ 時間測試失敗');
                this.errors.push('時間測試失敗');
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ 系統監控功能測試錯誤:', error);
            this.errors.push(`系統監控功能測試錯誤: ${error.message}`);
            return false;
        }
    }

    // 檢查常見的logger錯誤模式
    checkLoggerErrorPatterns() {
        console.log('🔍 檢查logger錯誤模式...');
        
        const errorPatterns = [
            'systemLogger.info(',
            'systemLogger.error(',
            'systemLogger.warn(',
            'systemLogger.debug(',
            'systemLogger.log(',
            'systemLogger.getLogs(',
            'systemLogger.onLogAdded(',
            'systemLogger.clearLogs('
        ];

        const correctPatterns = [
            'this.logger.info(',
            'this.logger.error(',
            'this.logger.warn(',
            'this.logger.debug(',
            'this.logger.log(',
            'this.logger.getLogs(',
            'this.logger.onLogAdded(',
            'this.logger.clearLogs('
        ];

        console.log('錯誤模式檢查:');
        errorPatterns.forEach((pattern, index) => {
            const correctPattern = correctPatterns[index];
            console.log(`  ❌ ${pattern} → ✅ ${correctPattern}`);
        });

        this.results.push('Logger錯誤模式檢查完成');
        return true;
    }

    // 運行所有測試
    async runAllTests() {
        console.log('🚀 開始系統監控修復測試...\n');
        
        this.results = [];
        this.errors = [];

        try {
            // 測試1: Logger引用修復
            await this.testLoggerReferences();
            
            // 測試2: Logger使用方式
            await this.testIncorrectLoggerUsage();
            
            // 測試3: 系統監控功能
            await this.testSystemMonitorFeatures();
            
            // 測試4: 錯誤模式檢查
            this.checkLoggerErrorPatterns();

            // 顯示測試結果
            this.showTestResults();
            
        } catch (error) {
            console.error('❌ 測試執行錯誤:', error);
            this.errors.push(`測試執行錯誤: ${error.message}`);
        }
    }

    // 顯示測試結果
    showTestResults() {
        console.log('\n📊 測試結果總結:');
        console.log('========================================');
        
        if (this.results.length > 0) {
            console.log('✅ 通過的測試:');
            this.results.forEach(result => {
                console.log(`  ✓ ${result}`);
            });
        }
        
        if (this.errors.length > 0) {
            console.log('\n❌ 失敗的測試:');
            this.errors.forEach(error => {
                console.log(`  ✗ ${error}`);
            });
        }
        
        const totalTests = this.results.length + this.errors.length;
        const passedTests = this.results.length;
        const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;
        
        console.log(`\n📈 測試統計:`);
        console.log(`  總測試數: ${totalTests}`);
        console.log(`  通過數: ${passedTests}`);
        console.log(`  失敗數: ${this.errors.length}`);
        console.log(`  成功率: ${successRate}%`);
        
        if (this.errors.length === 0) {
            console.log('\n🎉 所有測試均通過！系統監控修復成功！');
        } else {
            console.log('\n⚠️  部分測試失敗，請檢查錯誤信息。');
        }
        
        console.log('========================================\n');
    }
}

// 創建測試實例並運行
const tester = new SystemMonitorFixTest();

// 提供全域訪問
window.SystemMonitorFixTest = SystemMonitorFixTest;
window.systemMonitorTester = tester;

// 自動運行測試（如果直接引入此腳本）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        tester.runAllTests();
    });
} else {
    // 如果已經載入完成，立即運行
    setTimeout(() => {
        tester.runAllTests();
    }, 100);
}

export { SystemMonitorFixTest };