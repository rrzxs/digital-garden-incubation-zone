#!/bin/bash
# 阶段1: 灵感捕获 (05:00)
set -e

PROJECT_DIR="/opt/digital-garden-incubation-zone"
DATE=$(date +%Y-%m-%d)
LOG_FILE="$PROJECT_DIR/.agent/logs/workflow-$DATE.log"

mkdir -p "$PROJECT_DIR/.agent/logs" "$PROJECT_DIR/.agent/inspiration"

cd "$PROJECT_DIR"

echo "[$(date '+%H:%M:%S')] [阶段1] 灵感捕获 - 开始" | tee -a "$LOG_FILE"

# 搜索最新 Web 交互创意
QUERIES=(
    "ProductHunt trending web app 2025 micro-interaction"
    "Github trending web component animation"
    "creative web design inspiration 2025"
)

RANDOM_INDEX=$((RANDOM % ${#QUERIES[@]}))
QUERY="${QUERIES[$RANDOM_INDEX]}"

echo "[$(date '+%H:%M:%S')] 搜索: $QUERY" | tee -a "$LOG_FILE"

SEARCH_RESULT=$(python3 ~/.openclaw/skills/searxng-search/search.py "$QUERY" 8 2>/dev/null || echo "搜索失败")

# 保存灵感到备忘录
INSPIRATION_FILE="$PROJECT_DIR/.agent/inspiration/$DATE.md"

cat > "$INSPIRATION_FILE" << EOF
# 灵感备忘录 - $DATE

## 搜索来源
- 关键词: $QUERY
- 时间: $(date)

## 搜索结果
$SEARCH_RESULT

## 提取的创意点
(待 AI 分析填充)

## 痛点分析
(待 AI 分析填充)
EOF

echo "[$(date '+%H:%M:%S')] [阶段1] 完成 - 灵感已保存至: $INSPIRATION_FILE" | tee -a "$LOG_FILE"
