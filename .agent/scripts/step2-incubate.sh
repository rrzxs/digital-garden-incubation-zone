#!/bin/bash
# 阶段2: 创意孵化 - 05:30
# 从灵感中选取创意，自动去重
set -e

cd /opt/digital-garden-incubation-zone
DATE=$(date +%Y-%m-%d)
LOG_FILE=".agent/logs/workflow-${DATE}.log"

echo "[$(date +%H:%M:%S)] [阶段2] 创意孵化 - 开始" | tee -a "$LOG_FILE"
rm -f .agent/ideas/current-seed.txt

normalize_ideas() {
  sed -E \
    -e 's/^[[:space:]]*[-*0-9.)]+[[:space:]]*//' \
    -e 's/^`?([a-z][a-z0-9-]*)`?[[:space:]]*[:|-][[:space:]]*/\1 - /' \
    -e 's/^[[:space:]]+//' |
    grep -E '^[a-z][a-z0-9-]*[[:space:]]+-[[:space:]]+' || true
}

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
  EMERGENCY_PROMPT="生成 5 个实用的 Web 工具创意。

要求：
1. 优先工具类/功能类产品，能解决实际问题
2. 适合用纯前端技术实现（Vanilla JS + CSS）
3. UI 审美要在线，有氛围感
4. 已存在的项目不能重复: $EXISTING_SEEDS
5. 输出格式：每行一个 \"目录名 - 简短描述\"

创意方向参考：
- 生产力工具（番茄钟、习惯追踪、专注计时器...）
- 内容创作辅助（配色生成器、文案工具、排版预览...）
- 生活实用工具（倒计时、纪念日计算、账单分摊...）
- 数据可视化（进度追踪、统计图表...）

  目录名必须是：
- 小写英文字母
- 用连字符分隔单词
- 简短有意义

直接输出 5 行，不要其他说明。"

  EMERGENCY_IDEAS=$(opencode run "$EMERGENCY_PROMPT" 2>>"$LOG_FILE" || echo "")
  printf '%s\n' "$EMERGENCY_IDEAS" | normalize_ideas > "$IDEAS_FILE" || true
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
  
  FRESH_PROMPT="生成一个全新的、实用的 Web 工具创意。

严格要求：
1. 必须是工具类/功能类产品，能解决实际问题
2. 必须与以下已存在的项目完全不同: $EXISTING_SEEDS $INCUBATED
3. 目录名使用小写+连字符格式
4. 适合纯前端实现
5. UI 审美要在线，有氛围感

创意方向参考：
- 生产力工具（番茄钟、习惯追踪、专注计时器...）
- 内容创作辅助（配色生成器、文案工具、排版预览...）
- 生活实用工具（倒计时、纪念日计算、账单分摊...）

输出格式（仅一行）：
目录名 - 简短描述"

  FRESH_IDEAS=$(opencode run "$FRESH_PROMPT" 2>>"$LOG_FILE" || echo "unique-ambient - 独特氛围空间")
  FILTERED_IDEAS=$(printf '%s\n' "$FRESH_IDEAS" | normalize_ideas || true)
fi

# 6. 随机选择一个（或取第一个）
SELECTED=$(printf '%s\n' "$FILTERED_IDEAS" | grep -E '.' | shuf -n 1 2>/dev/null || printf '%s\n' "$FILTERED_IDEAS" | head -1)
if [ -z "$SELECTED" ]; then
  echo "[$(date +%H:%M:%S)] ✗ 未能选出有效创意，阶段2失败" | tee -a "$LOG_FILE"
  exit 1
fi

SEED_NAME=$(printf '%s\n' "$SELECTED" | sed 's/ -.*//' | tr -d ' ' | tr '[:upper:]' '[:lower:]')
SEED_DESC=$(printf '%s\n' "$SELECTED" | sed -E 's/^[a-z0-9-]+[[:space:]]+-[[:space:]]*//')

echo "[$(date +%H:%M:%S)] ★ 选定创意: $SEED_NAME - $SEED_DESC" | tee -a "$LOG_FILE"

# 7. 生成完整的产品描述（用 AI 增强）
ENHANCE_PROMPT="为以下 Web 交互创意生成一句吸引人的 Tagline（15字以内英文）和核心交互描述（2-3句话）。

创意: $SEED_NAME - $SEED_DESC

输出格式：
Tagline: [一句话]
Interaction: [交互描述]"

ENHANCED=$(opencode run "$ENHANCE_PROMPT" 2>>"$LOG_FILE" || echo "Tagline: $SEED_DESC
Interaction: 高阶微交互体验")
TAGLINE=$(printf '%s\n' "$ENHANCED" | sed -n 's/^Tagline:[[:space:]]*//p' | head -1)
INTERACTION=$(printf '%s\n' "$ENHANCED" | sed -n 's/^Interaction:[[:space:]]*//p' | head -1)

if [ -z "$TAGLINE" ]; then
  TAGLINE="$SEED_DESC"
fi

if [ -z "$INTERACTION" ]; then
  INTERACTION="围绕 ${SEED_NAME} 构建完整的高阶微交互体验。"
fi

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
