#!/bin/bash
# 阶段1: 灵感捕获 - 05:00
# 从网络捕获真实创意灵感，而非使用固定池
set -e

cd /opt/digital-garden-incubation-zone
DATE=$(date +%Y-%m-%d)
LOG_FILE=".agent/logs/workflow-${DATE}.log"

echo "[$(date +%H:%M:%S)] [阶段1] 灵感捕获 - 开始" | tee -a "$LOG_FILE"

# 创建灵感目录
mkdir -p .agent/inspiration

# 扩展搜索策略 - 更精准的关键词
SEARCH_QUERIES=(
  # 产品设计灵感
  "ProductHunt today best web app 2025"
  "best web tools this week 2025"
  # 设计趋势
  "web design trends 2025 interactions"
  "CSS animation codepen 2025"
  "micro-interaction examples codepen"
  # 生成艺术
  "creative coding p5.js examples"
  "webgl shader art tutorial"
  # 实用工具
  "online productivity tools simple"
  "web-based utility apps"
  # 氛围设计
  "ambient UI design examples"
  "immersive website experience"
)

ALL_RESULTS=""

for QUERY in "${SEARCH_QUERIES[@]}"; do
  echo "[$(date +%H:%M:%S)] 搜索: $QUERY" | tee -a "$LOG_FILE"
  RESULT=$(python3 ~/.openclaw/skills/searxng-search/search.py "$QUERY" 3 2>/dev/null || echo "")
  ALL_RESULTS="$ALL_RESULTS

### 搜索: $QUERY
$RESULT"
  sleep 1  # 避免请求过快
done

# 使用 AI 提取创意方向
echo "[$(date +%H:%M:%S)] 使用 AI 提取创意方向..." | tee -a "$LOG_FILE"

CREATIVE_PROMPT="基于以下搜索结果，提取 5 个独特的 Web 交互创意方向。

要求：
1. 每个创意必须是独特的、未常见的交互效果
2. 适合用纯前端技术 (HTML/CSS/JS) 实现
3. 具有视觉冲击力和氛围感
4. 输出格式：每行一个，格式为 \"目录名 - 简短描述\"

搜索结果：
$ALL_RESULTS

请直接输出 5 个创意，每行一个，不要其他说明。"

# 调用 AI 提取创意（使用默认模型配置）
CREATIVE_IDEAS=$(opencode run "$CREATIVE_PROMPT" 2>/dev/null || echo "")

# 保存完整灵感
INSPIRATION_FILE=".agent/inspiration/${DATE}.md"
cat > "$INSPIRATION_FILE" << EOF
# 灵感捕获 - $DATE

## 原始搜索结果
$ALL_RESULTS

## AI 提取的创意方向
$CREATIVE_IDEAS

---
*自动生成于 $(date)*
EOF

# 保存创意列表供 step2 使用
IDEAS_FILE=".agent/inspiration/${DATE}-ideas.txt"
echo "$CREATIVE_IDEAS" | grep -E '^[a-z]' > "$IDEAS_FILE" || true

IDEAS_COUNT=$(wc -l < "$IDEAS_FILE" 2>/dev/null || echo "0")
echo "[$(date +%H:%M:%S)] [阶段1] 完成 - 提取了 $IDEAS_COUNT 个创意方向" | tee -a "$LOG_FILE"
echo "[$(date +%H:%M:%S)] 灵感已保存至: $INSPIRATION_FILE" | tee -a "$LOG_FILE"
