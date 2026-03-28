#!/bin/bash
# 阶段2: 创意孵化 - 05:30
# 从灵感中选取创意，自动去重
set -e

cd /opt/digital-garden-incubation-zone
DATE=$(date +%Y-%m-%d)
LOG_FILE=".agent/logs/workflow-${DATE}.log"

echo "[$(date +%H:%M:%S)] [阶段2] 创意孵化 - 开始" | tee -a "$LOG_FILE"

# 1. 获取已存在的种子目录（去重核心）
EXISTING_SEEDS=$(ls -1 seeds/ 2>/dev/null | tr '\n' ' ')
echo "[$(date +%H:%M:%S)] 已存在种子: $EXISTING_SEEDS" | tee -a "$LOG_FILE"

# 2. 获取历史孵化记录（防止重复）
HISTORY_FILE=".agent/ideas/incubation-history.txt"
mkdir -p .agent/ideas
touch "$HISTORY_FILE"
INCUBATED=$(cat "$HISTORY_FILE" | tr '\n' ' ')
echo "[$(date +%H:%M:%S)] 历史孵化: $INCUBATED" | tee -a "$LOG_FILE"

# 3. 读取今日灵感列表
IDEAS_FILE=".agent/inspiration/${DATE}-ideas.txt"

if [ ! -f "$IDEAS_FILE" ] || [ ! -s "$IDEAS_FILE" ]; then
  echo "[$(date +%H:%M:%S)] 灵感文件不存在或为空，使用 AI 生成创意" | tee -a "$LOG_FILE"
  
  # 紧急生成创意
  EMERGENCY_PROMPT="生成 5 个独特的 Web 交互创意。

要求：
1. 每个创意必须是独特的微交互效果
2. 适合用纯前端技术实现
3. 具有视觉冲击力
4. 已存在的项目不能重复: $EXISTING_SEEDS
5. 输出格式：每行一个 \"目录名 - 简短描述\"

目录名必须是：
- 小写英文字母
- 用连字符分隔单词
- 简短有意义

直接输出 5 行，不要其他说明。"

  EMERGENCY_IDEAS=$(opencode run "$EMERGENCY_PROMPT" 2>/dev/null || echo "")
  echo "$EMERGENCY_IDEAS" | grep -E '^[a-z]' > "$IDEAS_FILE"
fi

# 4. 过滤已存在的种子
FILTERED_IDEAS=""
while IFS= read -r line; do
  if [ -z "$line" ]; then continue; fi
  
  # 提取目录名（" - " 之前的部分）
  SEED_NAME=$(echo "$line" | cut -d'-' -f1 | tr -d ' ' | tr '[:upper:]' '[:lower:]')
  # 如果目录名本身包含连字符，需要特殊处理
  # 格式: "dir-name - description"，所以取最后一个 " - " 之前的部分
  SEED_NAME=$(echo "$line" | sed 's/ -.*//' | tr '[:upper:]' '[:lower:]' | tr -d ' ')
  
  # 检查是否已存在
  if [[ ! " $EXISTING_SEEDS " =~ " $SEED_NAME " ]] && [[ ! " $INCUBATED " =~ " $SEED_NAME " ]]; then
    FILTERED_IDEAS="$FILTERED_IDEAS$line
"
    echo "[$(date +%H:%M:%S)] ✓ 候选: $SEED_NAME" | tee -a "$LOG_FILE"
  else
    echo "[$(date +%H:%M:%S)] ✗ 跳过已存在: $SEED_NAME" | tee -a "$LOG_FILE"
  fi
done < "$IDEAS_FILE"

# 5. 如果过滤后为空，AI 生成全新创意
if [ -z "$FILTERED_IDEAS" ]; then
  echo "[$(date +%H:%M:%S)] 所有候选都已存在，生成全新创意" | tee -a "$LOG_FILE"
  
  FRESH_PROMPT="生成一个全新的、从未见过的 Web 交互创意。

严格要求：
1. 必须与以下已存在的项目完全不同: $EXISTING_SEEDS $INCUBATED
2. 目录名使用小写+连字符格式
3. 适合纯前端实现
4. 具有独特的视觉氛围

输出格式（仅一行）：
目录名 - 简短描述"

  FILTERED_IDEAS=$(opencode run "$FRESH_PROMPT" 2>/dev/null || echo "unique-ambient - 独特氛围空间")
fi

# 6. 随机选择一个（或取第一个）
SELECTED=$(echo "$FILTERED_IDEAS" | shuf -n 1 2>/dev/null || echo "$FILTERED_IDEAS" | head -1)
SEED_NAME=$(echo "$SELECTED" | cut -d'-' -f1 | tr -d ' ' | tr '[:upper:]' '[:lower:]')
SEED_DESC=$(echo "$SELECTED" | cut -d'-' -f2- | sed 's/^[[:space:]]*//')

echo "[$(date +%H:%M:%S)] ★ 选定创意: $SEED_NAME - $SEED_DESC" | tee -a "$LOG_FILE"

# 7. 生成完整的产品描述（用 AI 增强）
ENHANCE_PROMPT="为以下 Web 交互创意生成一句吸引人的 Tagline（15字以内英文）和核心交互描述（2-3句话）。

创意: $SEED_NAME - $SEED_DESC

输出格式：
Tagline: [一句话]
Interaction: [交互描述]"

ENHANCED=$(opencode run "$ENHANCE_PROMPT" 2>/dev/null || echo "Tagline: $SEED_DESC
Interaction: 高阶微交互体验")
TAGLINE=$(echo "$ENHANCED" | grep "Tagline:" | cut -d':' -f2- | sed 's/^[[:space:]]*//')
INTERACTION=$(echo "$ENHANCED" | grep "Interaction:" | cut -d':' -f2- | sed 's/^[[:space:]]*//')

echo "[$(date +%H:%M:%S)] Tagline: $TAGLINE" | tee -a "$LOG_FILE"

# 8. 保存创意详情
IDEA_FILE=".agent/ideas/${DATE}-${SEED_NAME}.json"
cat > "$IDEA_FILE" << EOF
{
  "date": "$DATE",
  "name": "$SEED_NAME",
  "description": "$SEED_DESC",
  "tagline": "$TAGLINE",
  "interaction": "$INTERACTION",
  "directory": "seeds/${SEED_NAME}/",
  "status": "incubated"
}
EOF

# 9. 记录到历史
echo "$SEED_NAME" >> "$HISTORY_FILE"

# 10. 保存当前种子名称供下一阶段
echo "$SEED_NAME" > .agent/ideas/current-seed.txt

echo "[$(date +%H:%M:%S)] [阶段2] 完成 - 创意已保存至: $IDEA_FILE" | tee -a "$LOG_FILE"
