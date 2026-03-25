#!/bin/bash
# 测试创意孵化逻辑（不执行开发）
set -e

cd /opt/digital-garden-incubation-zone
DATE=$(date +%Y-%m-%d)
LOG_FILE=".agent/logs/test-${DATE}.log"

echo "========================================" | tee -a "$LOG_FILE"
echo "测试创意孵化逻辑 - $(date)" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

# 1. 显示已存在的种子
echo ""
echo "📁 已存在的种子目录:" | tee -a "$LOG_FILE"
ls -1 seeds/ | nl | tee -a "$LOG_FILE"

# 2. 显示历史孵化记录
echo ""
echo "📜 历史孵化记录:" | tee -a "$LOG_FILE"
cat .agent/ideas/incubation-history.txt 2>/dev/null | nl | tee -a "$LOG_FILE" || echo "(无记录)" | tee -a "$LOG_FILE"

# 3. 模拟创意孵化（不实际生成）
echo ""
echo "🔄 测试去重逻辑..." | tee -a "$LOG_FILE"

# 模拟候选列表
CANDIDATES=(
  "code-rain - 代码雨效果"
  "magnetic-cursor - 磁力光标"
  "typewriter - 打字机效果"
  "aurora-flow - 极光流动效果"
  "pixel-dissolve - 像素溶解过渡"
)

EXISTING=$(ls -1 seeds/ | tr '\n' ' ')
INCUBATED=$(cat .agent/ideas/incubation-history.txt 2>/dev/null | tr '\n' ' ')

echo ""
echo "候选创意过滤结果:" | tee -a "$LOG_FILE"
for CANDIDATE in "${CANDIDATES[@]}"; do
  # 使用 " - " 作为分隔符提取目录名
  SEED_NAME=$(echo "$CANDIDATE" | sed 's/ -.*//' | tr '[:upper:]' '[:lower:]')
  
  if [[ " $EXISTING " =~ " $SEED_NAME " ]]; then
    echo "  ✗ $SEED_NAME (目录已存在)" | tee -a "$LOG_FILE"
  elif [[ " $INCUBATED " =~ " $SEED_NAME " ]]; then
    echo "  ✗ $SEED_NAME (历史已孵化)" | tee -a "$LOG_FILE"
  else
    echo "  ✓ $SEED_NAME (可用)" | tee -a "$LOG_FILE"
  fi
done

echo ""
echo "========================================" | tee -a "$LOG_FILE"
echo "测试完成。运行 ./step1-inspiration.sh 和 ./step2-incubate.sh 进行实际孵化" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"
