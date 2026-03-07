#!/bin/bash
# 数字花园孵化器 - 每日自动化工作流
# 执行顺序：灵感捕获 → 创意孵化 → 委派研发 → 部署

set -e

PROJECT_DIR="/opt/digital-garden-incubation-zone"
LOG_DIR="$PROJECT_DIR/.agent/logs"
DATE=$(date +%Y-%m-%d)
LOG_FILE="$LOG_DIR/workflow-$DATE.log"

mkdir -p "$LOG_DIR"

log() {
    echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========================================"
log "数字花园孵化器 - 每日工作流启动"
log "========================================"

cd "$PROJECT_DIR"

# ============================================================================
# 阶段 1: 灵感捕获 (05:00)
# ============================================================================
log "[阶段1] 灵感捕获 - 开始"

# 使用 SearXNG 搜索最新 Web 交互创意
INSPIRATION_QUERY="ProductHunt trending web app 2025 micro-interaction"
log "搜索灵感: $INSPIRATION_QUERY"

SEARCH_RESULT=$(python3 ~/.openclaw/skills/searxng-search/search.py "$INSPIRATION_QUERY" 5 2>/dev/null || echo "搜索失败")

# 保存灵感到备忘录
INSPIRATION_FILE="$PROJECT_DIR/.agent/inspiration/$DATE.md"
mkdir -p "$(dirname "$INSPIRATION_FILE")"

cat > "$INSPIRATION_FILE" << EOF
# 灵感备忘录 - $DATE

## 搜索来源
- 关键词: $INSPIRATION_QUERY
- 时间: $(date)

## 搜索结果
$SEARCH_RESULT

## 提取的创意点
(待填充)

## 痛点分析
(待填充)
EOF

log "[阶段1] 灵感已保存至: $INSPIRATION_FILE"

# ============================================================================
# 阶段 2: 创意孵化 (05:30)
# ============================================================================
log "[阶段2] 创意孵化 - 开始"

# 这里需要 AI 来生成创意，暂时使用预设模板
# 实际运行时会通过 OpenClaw 的 heartbeat 或手动触发

# 随机选择一个创意方向
CREATIVE_DIRECTIONS=(
    "ambient-soundscape:环境音景生成器 - 沉浸式自然声音混合器，支持多层音轨叠加与空间化处理"
    "pixel-mood:像素情绪日历 - 用像素艺术记录每日情绪，生成年度情绪可视化图谱"
    "terminal-poetry:终端诗人 - 复古终端风格的诗歌生成器，带有打字机效果和 CRT 扫描线"
    "gravity-notes:重力便签 - 物理引擎驱动的便签墙，便签会根据内容重量产生重力效果"
    "pulse-timer:脉冲计时器 - 可视化心跳节奏的番茄钟，用呼吸灯效果引导专注"
)

RANDOM_INDEX=$((RANDOM % ${#CREATIVE_DIRECTIONS[@]}))
SELECTED_IDEA="${CREATIVE_DIRECTIONS[$RANDOM_INDEX]}"

SEED_NAME=$(echo "$SELECTED_IDEA" | cut -d: -f1)
SEED_TAGLINE=$(echo "$SELECTED_IDEA" | cut -d: -f2-)

log "[阶段2] 选定创意: $SEED_NAME"
log "[阶段2] Tagline: $SEED_TAGLINE"

# 保存创意到文件
IDEA_FILE="$PROJECT_DIR/.agent/ideas/$DATE-$SEED_NAME.json"
mkdir -p "$(dirname "$IDEA_FILE")"

cat > "$IDEA_FILE" << EOF
{
    "date": "$DATE",
    "seed_name": "$SEED_NAME",
    "tagline": "$SEED_TAGLINE",
    "directory": "./seeds/$SEED_NAME/",
    "status": "pending",
    "tags": ["creative", "web-app", "micro-interaction"]
}
EOF

log "[阶段2] 创意已保存至: $IDEA_FILE"

# ============================================================================
# 阶段 3: 委派研发 (06:00)
# ============================================================================
log "[阶段3] 委派研发 - 启动 opencode"

# 构造开发指令
DEV_PROMPT=$(cat << 'PROMPT_EOF'
你是数字花园孵化器的研发 Agent。请按照以下规范开发一个新的种子项目：

## 项目信息
- **项目名称**: SEED_NAME_PLACEHOLDER
- **目录**: ./seeds/SEED_NAME_PLACEHOLDER/
- **Tagline**: TAGLINE_PLACEHOLDER

## 开发要求

### 1. 文件结构
在 `./seeds/SEED_NAME_PLACEHOLDER/` 目录下创建：
- `index.html` - 主页面
- `style.css` - 样式文件
- `main.js` - 交互逻辑
- `README.md` - 项目说明

### 2. 必须遵循规范
请先阅读并严格遵循 `.agent/rules/opencode.md` 中的规范：
- 免构建优先 (Vanilla JS + CSS3 + HTML5)
- 硅谷审美：无衬线字体、流体渐变、微晶玻璃态、非线性动效
- 100% 完整代码交付，禁止占位符

### 3. 核心交互
根据项目 Tagline 实现核心交互功能，确保：
- 视觉上有"氛围感"
- 微交互流畅自然
- 适配移动端

### 4. 注册种子
开发完成后，必须修改根目录 `./main.js`：
在 `const seeds = [...]` 数组中添加新种子的元数据：
```javascript
{
    title: "项目标题",
    description: "TAGLINE_PLACEHOLDER",
    path: "./seeds/SEED_NAME_PLACEHOLDER/index.html",
    tags: ["Tag1", "Tag2"],
    icon: "🎯",
    status: "已发布"
}
```

请开始开发。
PROMPT_EOF
)

# 替换占位符
DEV_PROMPT="${DEV_PROMPT//SEED_NAME_PLACEHOLDER/$SEED_NAME}"
DEV_PROMPT="${DEV_PROMPT//TAGLINE_PLACEHOLDER/$SEED_TAGLINE}"

log "[阶段3] 执行 opencode run..."

# 执行 opencode (非交互模式)
cd "$PROJECT_DIR"
timeout 600 opencode run "$DEV_PROMPT" 2>&1 | tee -a "$LOG_FILE" || {
    log "[阶段3] 警告: opencode 执行超时或出错"
}

# 验证文件是否生成
if [ -f "$PROJECT_DIR/seeds/$SEED_NAME/index.html" ]; then
    log "[阶段3] ✓ index.html 已生成"
else
    log "[阶段3] ✗ index.html 未生成，需要手动修复"
fi

if [ -f "$PROJECT_DIR/seeds/$SEED_NAME/style.css" ]; then
    log "[阶段3] ✓ style.css 已生成"
fi

if [ -f "$PROJECT_DIR/seeds/$SEED_NAME/main.js" ]; then
    log "[阶段3] ✓ main.js 已生成"
fi

# ============================================================================
# 阶段 4: 部署 (08:00)
# ============================================================================
log "[阶段4] 部署 - 开始"

# Git 提交
cd "$PROJECT_DIR"
git add . 2>/dev/null || true
git commit -m "feat(seed): 孵化器新增 [$SEED_NAME] 原型 - $DATE" 2>/dev/null || log "[阶段4] 无新变更需要提交"

# 部署 (需要 SERVER_PASSWORD 环境变量)
if [ -n "$SERVER_PASSWORD" ]; then
    log "[阶段4] 执行部署脚本..."
    SERVER_PASSWORD="$SERVER_PASSWORD" ./deploy.sh 2>&1 | tee -a "$LOG_FILE" || {
        log "[阶段4] 部署失败，请检查日志"
    }
    log "[阶段4] ✓ 部署完成"
else
    log "[阶段4] 跳过部署 (SERVER_PASSWORD 未设置)"
fi

# ============================================================================
# 完成
# ============================================================================
log "========================================"
log "每日工作流完成"
log "今日种子: $SEED_NAME"
log "线上地址: https://rrzxs.com/seed"
log "日志文件: $LOG_FILE"
log "========================================"

# 输出摘要供外部调用
echo "SUMMARY:$SEED_NAME:$SEED_TAGLINE" > "$PROJECT_DIR/.agent/last-run.txt"
