{
  "schema": "heartbeat/v1",
  "note": "Keep tasks array empty to skip heartbeat API calls. Add tasks when you want the agent to check something periodically.",
  "tasks": [
    {
      "name": "Cloudflareブログ新着監視",
      "type": "rss_monitor",
      "source": "https://blog.cloudflare.com/rss/",
      "state_key": "lastCloudflareArticleUrl",
      "action": "新着があれば記事を取得して解説 + URLを通知"
    },
    {
      "name": "今日の日記送信",
      "type": "scheduled_message",
      "interval": "12時間ごと",
      "source_file": "memory/YYYY-MM-DD.md",
      "target_channel": "1404724174890602496",
      "fallback_message": "今日の日記はまだありません",
      "state_key": "lastDiarySentDate",
      "dedup_rule": "同じ日の日記は1日1回のみ送信"
    }
  ]
}