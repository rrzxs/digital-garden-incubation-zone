#!/bin/bash
# 阶段2: 创意孵化 (05:30)
set -e

PROJECT_DIR="/opt/digital-garden-incubation-zone"
DATE=$(date +%Y-%m-%d)
LOG_FILE="$PROJECT_DIR/.agent/logs/workflow-$DATE.log"

mkdir -p "$PROJECT_DIR/.agent/logs" "$PROJECT_DIR/.agent/ideas"

cd "$PROJECT_DIR"

echo "[$(date '+%H:%M:%S')] [阶段2] 创意孵化 - 开始" | tee -a "$LOG_FILE"

# 创意库 - 随机选择
CREATIVE_IDEAS=(
    "ambient-soundscape|环境音景生成器|沉浸式自然声音混合器，支持多层音轨叠加与空间化处理，Web Audio API 驱动"
    "pixel-mood|像素情绪日历|用 8-bit 像素艺术记录每日情绪，生成年度情绪可视化图谱，带有复古游戏感"
    "terminal-poetry|终端诗人|复古终端风格的 AI 诗歌生成器，打字机效果 + CRT 扫描线 + 磷光绿配色"
    "gravity-notes|重力便签|物理引擎驱动的便签墙，便签根据内容长度产生重力效果，可拖拽碰撞"
    "pulse-timer|脉冲计时器|可视化心跳节奏的番茄钟，用呼吸灯效果引导专注，支持自定义脉冲波形"
    "neon-sign|霓虹灯牌生成器|实时渲染的霓虹灯效果生成器，支持自定义文字、颜色、闪烁模式"
    "fluid-loader|流体加载动画|流体模拟驱动的加载动画，可以用鼠标交互扰动流体"
    "code-rain|代码雨屏保|Matrix 风格的代码雨，但落下的是真实的代码片段，支持自定义语言"
    "magnetic-cursor|磁力光标|光标周围的元素会被磁力吸引或排斥，创造有趣的交互体验"
    "echo-typing|回声打字机|打字时每个字符都会产生视觉回声和音效，营造沉浸式写作体验"
)

RANDOM_INDEX=$((RANDOM % ${#CREATIVE_IDEAS[@]}))
SELECTED="${CREATIVE_IDEAS[$RANDOM_INDEX]}"

SEED_NAME=$(echo "$SELECTED" | cut -d'|' -f1)
SEED_TITLE=$(echo "$SELECTED" | cut -d'|' -f2)
SEED_TAGLINE=$(echo "$SELECTED" | cut -d'|' -f3)

echo "[$(date '+%H:%M:%S')] 选定创意: $SEED_NAME - $SEED_TITLE" | tee -a "$LOG_FILE"
echo "[$(date '+%H:%M:%S')] Tagline: $SEED_TAGLINE" | tee -a "$LOG_FILE"

# 保存创意
IDEA_FILE="$PROJECT_DIR/.agent/ideas/$DATE-$SEED_NAME.json"

cat > "$IDEA_FILE" << EOF
{
    "date": "$DATE",
    "seed_name": "$SEED_NAME",
    "title": "$SEED_TITLE",
    "tagline": "$SEED_TAGLINE",
    "directory": "./seeds/$SEED_NAME/",
    "status": "incubating",
    "tags": ["creative", "web-app", "micro-interaction"],
    "created_at": "$(date -Iseconds)"
}
EOF

echo "[$(date '+%H:%M:%S')] [阶段2] 完成 - 创意已保存至: $IDEA_FILE" | tee -a "$LOG_FILE"

# 输出供下一阶段使用
echo "$SEED_NAME|$SEED_TITLE|$SEED_TAGLINE" > "$PROJECT_DIR/.agent/ideas/current.txt"
