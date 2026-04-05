# scrapling - 高度なWebスクレイピング

Scraplingライブラリを使ったアンチボット対応Webスクレイピングシステム。

## Features

- Cloudflare対策
- JavaScriptレンダリング対応
- ブラウザフィンガープリント偽装
- 自動リトライ・セッション管理

## Usage

```
@nikechan Scraplingで{URL}取得して
@nikechan {URL}の内容教えて（Scrapling使用）
```

## Dependencies

- scrapling>=0.4

## Example

```python
from scrapling import Fetcher

fetcher = Fetcher()
page = fetcher.get("https://example.com")
print(page.text)
```
