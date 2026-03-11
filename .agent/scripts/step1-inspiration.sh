#!/bin/bash
# 阶段1: 灵感捕获 - 05:00
set -e

cd /opt/digital-garden-incubation-zone
DATE=$(date +%Y-%m-%d)
LOG_FILE=".agent/logs/workflow-${DATE}.log"

echo "[$(date +%H:%M:%S)] [阶段1] 灵感捕获 - 开始" | tee -a "$LOG_FILE"

# 搜索灵感
QUERY="creative web design inspiration $(date +%Y)"
echo "[$(date +%H:%M:%S)] 搜索: $QUERY" | tee -a "$LOG_FILE"

# 使用 SearXNG 搜索
INSPIRATION=$(python3 ~/.openclaw/skills/searxng-search/search.py "$QUERY" 5 2>/dev/null || echo "搜索失败")

# 保存灵感
INSPIRATION_FILE=".agent/inspiration/${DATE}.md"
mkdir -p .agent/inspiration

cat > "$INSPIRATION_FILE" << EOF
# 灵感捕获 - $DATE

## 搜索关键词
$QUERY

## 搜索结果
$INSPIRATION

## 提取的创意方向
- [待人工补充]

---
*自动生成于 $(date)*
EOF

echo "[$(date +%H:%M:%S)] [阶段1] 完成 - 灵感已保存至: $INSPIRATION_FILE" | tee -a "$LOG_FILE"
