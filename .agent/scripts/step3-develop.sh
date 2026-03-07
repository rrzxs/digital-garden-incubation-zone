#!/bin/bash
# 阶段3: 委派研发 (06:00)
set -e

PROJECT_DIR="/opt/digital-garden-incubation-zone"
DATE=$(date +%Y-%m-%d)
LOG_FILE="$PROJECT_DIR/.agent/logs/workflow-$DATE.log"

cd "$PROJECT_DIR"

echo "[$(date '+%H:%M:%S')] [阶段3] 委派研发 - 开始" | tee -a "$LOG_FILE"

# 读取当前创意
CURRENT_IDEA="$PROJECT_DIR/.agent/ideas/current.txt"

if [ ! -f "$CURRENT_IDEA" ]; then
    echo "[$(date '+%H:%M:%S')] 错误: 未找到创意文件，请先执行阶段2" | tee -a "$LOG_FILE"
    exit 1
fi

IDEA_CONTENT=$(cat "$CURRENT_IDEA")
SEED_NAME=$(echo "$IDEA_CONTENT" | cut -d'|' -f1)
SEED_TITLE=$(echo "$IDEA_CONTENT" | cut -d'|' -f2)
SEED_TAGLINE=$(echo "$IDEA_CONTENT" | cut -d'|' -f3)

echo "[$(date '+%H:%M:%S')] 开发种子: $SEED_NAME" | tee -a "$LOG_FILE"

# 构造开发指令
DEV_PROMPT="你是数字花园孵化器的研发 Agent。请按照以下规范开发一个新的种子项目：

## 项目信息
- **项目名称**: $SEED_NAME
- **目录**: ./seeds/$SEED_NAME/
- **标题**: $SEED_TITLE
- **Tagline**: $SEED_TAGLINE

## 开发要求

### 1. 文件结构
在 ./seeds/$SEED_NAME/ 目录下创建完整的文件：
- index.html - 主页面 (完整的 HTML5 结构)
- style.css - 样式文件 (硅谷审美)
- main.js - 交互逻辑 (完整可用)
- README.md - 项目说明

### 2. 必须遵循规范
请先阅读并严格遵循 .agent/rules/opencode.md 中的规范：
- 免构建优先 (Vanilla JS + CSS3 + HTML5，禁止 package.json)
- 字体：Inter, Outfit, Share Tech Mono 等现代无衬线字体
- 背景：流体网格渐变 + 超大模糊(filter: blur) + mix-blend-mode
- 容器：微晶玻璃态 (backdrop-filter: blur + 透明度 + 微发光描边)
- 动效：cubic-bezier(0.16, 1, 0.3, 1) 非线性曲线
- 100% 完整代码交付，禁止 // ... rest of code 占位符

### 3. 核心交互
根据项目 Tagline 实现: $SEED_TAGLINE
确保：
- 视觉上有强烈的\"氛围感\"
- 微交互流畅自然
- 适配移动端响应式

### 4. 注册种子 (重要！)
开发完成后，必须修改根目录 ./main.js：
在 const seeds = [...] 数组的开头添加新种子：

{
    title: \"$SEED_TITLE\",
    description: \"$SEED_TAGLINE\",
    path: \"./seeds/$SEED_NAME/index.html\",
    tags: [\"Creative\", \"Interactive\"],
    icon: \"✨\",
    status: \"已发布\"
}

请立即开始开发，生成完整可运行的代码。"

echo "[$(date '+%H:%M:%S')] 执行 opencode run..." | tee -a "$LOG_FILE"

# 执行 opencode (使用正确的模型)
echo "[$(date '+%H:%M:%S')] 使用模型: zhipuai-coding-plan/glm-4.7" | tee -a "$LOG_FILE"
timeout 900 opencode run -m zhipuai-coding-plan/glm-4.7 "$DEV_PROMPT" 2>&1 | tee -a "$LOG_FILE" || {
    echo "[$(date '+%H:%M:%S')] 警告: opencode 执行超时或出错" | tee -a "$LOG_FILE"
}

# 验证
echo "[$(date '+%H:%M:%S')] 验证生成文件..." | tee -a "$LOG_FILE"

if [ -f "$PROJECT_DIR/seeds/$SEED_NAME/index.html" ]; then
    echo "[$(date '+%H:%M:%S')] ✓ index.html 已生成" | tee -a "$LOG_FILE"
else
    echo "[$(date '+%H:%M:%S')] ✗ index.html 未生成" | tee -a "$LOG_FILE"
fi

if [ -f "$PROJECT_DIR/seeds/$SEED_NAME/style.css" ]; then
    echo "[$(date '+%H:%M:%S')] ✓ style.css 已生成" | tee -a "$LOG_FILE"
fi

if [ -f "$PROJECT_DIR/seeds/$SEED_NAME/main.js" ]; then
    echo "[$(date '+%H:%M:%S')] ✓ main.js 已生成" | tee -a "$LOG_FILE"
fi

# 保存当前种子名供部署使用
echo "$SEED_NAME" > "$PROJECT_DIR/.agent/ideas/current-seed.txt"

echo "[$(date '+%H:%M:%S')] [阶段3] 完成" | tee -a "$LOG_FILE"
