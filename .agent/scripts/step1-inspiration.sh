#!/bin/bash
# 阶段1: 灵感捕获 - 05:00
# 从网络捕获真实创意灵感，而非使用固定池
set -e

cd /opt/digital-garden-incubation-zone
DATE=$(date +%Y-%m-%d)
LOG_FILE=".agent/logs/workflow-${DATE}.log"
RAW_SOURCE_FILE=".agent/inspiration/${DATE}-sources.md"
INSPIRATION_FILE=".agent/inspiration/${DATE}.md"
IDEAS_FILE=".agent/inspiration/${DATE}-ideas.txt"

echo "[$(date +%H:%M:%S)] [阶段1] 灵感捕获 - 开始" | tee -a "$LOG_FILE"

# 创建灵感目录
mkdir -p .agent/inspiration

normalize_ideas() {
  sed -E \
    -e 's/^[[:space:]]*[-*0-9.)]+[[:space:]]*//' \
    -e 's/^`?([a-z][a-z0-9-]*)`?[[:space:]]*[:|-][[:space:]]*/\1 - /' \
    -e 's/^[[:space:]]+//' |
    grep -E '^[a-z][a-z0-9-]*[[:space:]]+-[[:space:]]+' || true
}

echo "[$(date +%H:%M:%S)] 抓取高质量灵感来源..." | tee -a "$LOG_FILE"
if ! python3 .agent/scripts/fetch_inspiration.py > "$RAW_SOURCE_FILE" 2>>"$LOG_FILE"; then
  echo "[$(date +%H:%M:%S)] 直抓失败，回退到 SearXNG 搜索" | tee -a "$LOG_FILE"
  {
    echo "# Fallback search sources"
    for QUERY in \
      "Awwwards site of the day interactive" \
      "CSS Design Awards web inspiration" \
      "frontend animation github project"
    do
      echo ""
      echo "## Query: $QUERY"
      python3 ~/.openclaw/skills/searxng-search/search.py "$QUERY" 4 2>>"$LOG_FILE" || true
    done
  } > "$RAW_SOURCE_FILE"
fi

SOURCE_COUNT=$(grep -c '^- SOURCE:' "$RAW_SOURCE_FILE" 2>/dev/null || echo "0")
echo "[$(date +%H:%M:%S)] 已汇总 $SOURCE_COUNT 条真实来源" | tee -a "$LOG_FILE"

# 使用 AI 提取创意方向
echo "[$(date +%H:%M:%S)] 使用 AI 提取创意方向..." | tee -a "$LOG_FILE"

CREATIVE_PROMPT="你是数字花园孵化器的产品策展人。请基于以下真实来源，提炼 6 个适合纯前端实现的新种子方向。

要求：
1. 不要复述来源站点本身，要抽象出“可做成一个独立 Web App / 微应用”的产品方向
2. 优先实用工具、创作辅助、可视化交互、沉浸式体验四类
3. 必须能用 HTML/CSS/JS 独立实现，不依赖后端
4. 必须避免与已有常见项目重名，比如 timer、todo、weather、calendar 这类过于普通的方向
5. 每行一个，严格输出为：目录名 - 20字内中文描述
6. 目录名必须是小写英文 slug，可带连字符
7. 不要加编号，不要 Markdown，不要解释
8. 严格优先参考 WEIGHT >= 0.90 的来源；0.70-0.89 只能做补充；低于 0.70 的来源只能借鉴视觉或实现线索，不能单独决定一个方向
9. 如果来源属于 CATEGORY=visual-motif，只能提炼出界面语言或微交互，不可直接把“作品集网站/展示页”本身当成创意
10. 至少输出 6 个方向；如果高质量来源不足，也要尽量从高权重来源中抽象，不要编造不存在的产品

真实来源：
$(cat "$RAW_SOURCE_FILE")"

# 调用 AI 提取创意（使用默认模型配置）
CREATIVE_IDEAS=$(opencode run "$CREATIVE_PROMPT" 2>>"$LOG_FILE" || echo "")

# 保存完整灵感
cat > "$INSPIRATION_FILE" << EOF
# 灵感捕获 - $DATE

## 真实来源
$(cat "$RAW_SOURCE_FILE")

## AI 提取的创意方向
$CREATIVE_IDEAS

---
*自动生成于 $(date)*
EOF

# 保存创意列表供 step2 使用
printf '%s\n' "$CREATIVE_IDEAS" | normalize_ideas > "$IDEAS_FILE" || true

IDEAS_COUNT=$(wc -l < "$IDEAS_FILE" 2>/dev/null || echo "0")
if [ "$IDEAS_COUNT" -lt 3 ]; then
  echo "[$(date +%H:%M:%S)] 警告: 创意提取不足 3 条，请检查来源或模型输出" | tee -a "$LOG_FILE"
fi
echo "[$(date +%H:%M:%S)] [阶段1] 完成 - 提取了 $IDEAS_COUNT 个创意方向" | tee -a "$LOG_FILE"
echo "[$(date +%H:%M:%S)] 灵感已保存至: $INSPIRATION_FILE" | tee -a "$LOG_FILE"
