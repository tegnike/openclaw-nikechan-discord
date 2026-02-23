#!/usr/bin/env python3
"""
URLファイルダウンローダー
curlの代替として機能
"""

import requests
import os
import re
from urllib.parse import urlparse
from pathlib import Path

class URLDownloader:
    def __init__(self, max_size=10*1024*1024, timeout=30):
        self.max_size = max_size  # 10MB
        self.timeout = timeout
        self.blocked_patterns = [
            r'^127\.', r'^192\.168\.', r'^10\.', r'^172\.(1[6-9]|2[0-9]|3[01])\.',
            r'^file://',
            r'^ftp://',
            r'localhost',
        ]
    
    def is_safe_url(self, url: str) -> bool:
        """URLが安全かチェック"""
        parsed = urlparse(url)
        
        # スキームチェック
        if parsed.scheme not in ['http', 'https']:
            return False
        
        # ブロックパターンチェック
        for pattern in self.blocked_patterns:
            if re.search(pattern, url, re.IGNORECASE):
                return False
        
        return True
    
    def download(self, url: str, output_dir: str = "/workspace/downloads") -> dict:
        """URLからファイルをダウンロード"""
        
        # 安全性チェック
        if not self.is_safe_url(url):
            return {
                'success': False,
                'error': '危険なURLが検出されました',
                'url': url
            }
        
        try:
            # ダウンロード
            response = requests.get(url, timeout=self.timeout, stream=True)
            response.raise_for_status()
            
            # サイズチェック
            content_length = response.headers.get('content-length')
            if content_length and int(content_length) > self.max_size:
                return {
                    'success': False,
                    'error': f'ファイルサイズが大きすぎます ({int(content_length)} bytes)',
                    'url': url
                }
            
            # ファイル名決定
            parsed = urlparse(url)
            filename = os.path.basename(parsed.path) or 'download'
            
            # 出力ディレクトリ作成
            os.makedirs(output_dir, exist_ok=True)
            output_path = os.path.join(output_dir, filename)
            
            # 保存
            with open(output_path, 'wb') as f:
                downloaded = 0
                for chunk in response.iter_content(chunk_size=8192):
                    downloaded += len(chunk)
                    if downloaded > self.max_size:
                        return {
                            'success': False,
                            'error': 'ダウンロード中にサイズ制限を超えました',
                            'url': url
                        }
                    f.write(chunk)
            
            return {
                'success': True,
                'path': output_path,
                'size': downloaded,
                'url': url,
                'content_type': response.headers.get('content-type', 'unknown')
            }
            
        except requests.exceptions.Timeout:
            return {
                'success': False,
                'error': 'タイムアウトしました',
                'url': url
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'url': url
            }
    
    def fetch_text(self, url: str) -> dict:
        """テキスト/JSONを取得"""
        result = self.download(url)
        
        if not result['success']:
            return result
        
        try:
            with open(result['path'], 'r', encoding='utf-8') as f:
                content = f.read()
            
            result['content'] = content[:1000]  # 先頭1000文字
            return result
        except:
            # バイナリファイルの場合
            return result

if __name__ == "__main__":
    # テスト
    downloader = URLDownloader()
    
    # テスト1: 正常なURL
    result = downloader.download("https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/25.png")
    print(f"Test 1: {result}")
    
    # テスト2: 危険なURL
    result = downloader.download("http://127.0.0.1/secret")
    print(f"Test 2: {result}")
