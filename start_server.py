#!/usr/bin/env python3
"""
簡單的HTTP伺服器啟動腳本
"""

import http.server
import socketserver
import os
import sys
import webbrowser
from threading import Timer

def start_server(port=8080, open_browser=True):
    """啟動HTTP伺服器"""
    try:
        # 更改到當前目錄
        os.chdir(os.path.dirname(os.path.abspath(__file__)))
        
        # 創建處理器
        handler = http.server.SimpleHTTPRequestHandler
        
        # 創建伺服器
        with socketserver.TCPServer(("", port), handler) as httpd:
            print(f"伺服器啟動成功！")
            print(f"訪問地址: http://localhost:{port}/")
            print(f"測試頁面: http://localhost:{port}/test-system-monitor.html")
            print("按 Ctrl+C 停止伺服器")
            
            # 自動打開瀏覽器
            if open_browser:
                def open_browser_delayed():
                    webbrowser.open(f'http://localhost:{port}/test-system-monitor.html')
                Timer(1.0, open_browser_delayed).start()
            
            # 啟動伺服器
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n伺服器停止")
        sys.exit(0)
    except Exception as e:
        print(f"錯誤: {e}")
        print(f"端口 {port} 可能已被佔用，嘗試使用其他端口")
        sys.exit(1)

if __name__ == "__main__":
    port = 8080
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("端口必須是數字")
            sys.exit(1)
    
    start_server(port)