#!/usr/bin/env python3
"""
Scraplingを使った高度なWebスクレイピングスクリプト
アンチボット対応（curl_cffiベース）
"""
import sys
from scrapling import Fetcher

def fetch_url(url):
    """URLの内容を取得する"""
    try:
        # Scrapling Fetcherで取得（curl_cffiベースで強力）
        fetcher = Fetcher()
        page = fetcher.get(url)
        
        print(f"=== {url} ===")
        print(f"Status: {page.status}")
        print(f"Encoding: {page.encoding}")
        
        # HTMLコンテンツ取得
        html_content = page.html_content
        
        # タイトル抽出
        if '<title>' in html_content.lower():
            start = html_content.lower().find('<title>') + 7
            end = html_content.lower().find('</title>')
            if end > start:
                title = html_content[start:end]
                print(f"Title: {title}")
        
        # 記事タイトルを探す（h2タグ）
        print("\n--- 記事タイトル（h2タグ） ---")
        h2_list = []
        temp = html_content
        while '<h2' in temp.lower():
            h2_start = temp.lower().find('<h2')
            h2_end = temp.find('>', h2_start) + 1
            close_start = temp.lower().find('</h2>', h2_end)
            if close_start > h2_end:
                title_text = temp[h2_end:close_start]
                # HTMLタグ除去
                import re
                clean = re.sub(r'<[^>]+>', '', title_text).strip()
                if clean and len(clean) > 5:
                    h2_list.append(clean)
                temp = temp[close_start + 5:]
            else:
                break
        
        for i, t in enumerate(h2_list[:10], 1):
            print(f"{i}. {t[:100]}")
        
        # 生HTML一部表示
        print("\n--- HTML Preview (first 1500 chars) ---")
        print(html_content[:1500])
        
        if len(html_content) > 1500:
            print("\n... (truncated)")
            
    except Exception as e:
        print(f"Error fetching {url}: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python fetch.py <URL>", file=sys.stderr)
        sys.exit(1)
    
    fetch_url(sys.argv[1])
