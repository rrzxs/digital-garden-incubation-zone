#!/bin/bash
# 阶段2: 创意孵化 - 05:30
set -e

cd /opt/digital-garden-incubation-zone
DATE=$(date +%Y-%m-%d)
LOG_FILE=".agent/logs/workflow-${DATE}.log"

echo "[$(date +%H:%M:%S)] [阶段2] 创意孵化 - 开始" | tee -a "$LOG_FILE"

# 读取今日灵感（简化版：直接生成一个随机创意）
# 实际可接入 AI 生成

# 创意池
IDEAS=(
  "fluid-gradient - 流体渐变背景生成器"
  "text-scramble - 文字解密动画效果"
  "magnetic-cursor - 磁力光标交互"
  "particle-wave - 粒子波浪动画"
  "glitch-text - 故障艺术文字"
  "code-rain - 代码雨屏保"
  "morph-shapes - 形态变换动画"
  "ripple-click - 点击涟漪效果"
  "gradient-mesh - 渐变网格生成器"
  "typewriter - 打字机效果"
)

# 随机选择
RANDOM_INDEX=$((RANDOM % ${#IDEAS[@]}))
SELECTED="${IDEAS[$RANDOM_INDEX]}"

SEED_NAME=$(echo "$SELECTED" | cut -d'-' -f1 | tr -d ' ')
SEED_DESC=$(echo "$SELECTED" | cut -d'-' -f2- | sed 's/^[[:space:]]*//')

echo "[$(date +%H:%M:%S)] 选定创意: $SEED_NAME - $SEED_DESC" | tee -a "$LOG_FILE"

# 生成 Tagline
TAGLINE="$SEED_DESC，支持高阶微交互与审美氛围感"
echo "[$(date +%H:%M:%S)] Tagline: $TAGLINE" | tee -a "$LOG_FILE"

# 保存创意
IDEA_FILE=".agent/ideas/${DATE}-${SEED_NAME}.json"
mkdir -p .agent/ideas

cat > "$IDEA_FILE" << EOF
{
  "date": "$DATE",
  "name": "$SEED_NAME",
  "description": "$SEED_DESC",
  "tagline": "$TAGLINE",
  "directory": "seeds/${SEED_NAME}/",
  "status": "incubated"
}
EOF

echo "[$(date +%H:%M:%S)] [阶段2] 完成 - 创意已保存至: $IDEA_FILE" | tee -a "$LOG_FILE"

# 保存当前种子名称供下一阶段使用
echo "$SEED_NAME" > .agent/ideas/current-seed.txt
