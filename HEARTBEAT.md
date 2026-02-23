# HEARTBEAT.md

# Keep this file empty (or only with comments) to skip heartbeat API calls.

# Add tasks below when you want the agent to check something periodically.

## 定期チェックタスク

### Cloudflareブログ新着監視
- RSSフィード: https://blog.cloudflare.com/rss/
- 前回の最新記事URLを `heartbeat-state.json` の `lastCloudflareArticleUrl` と比較
- 新着があれば記事を取得して解説 + URLを通知
