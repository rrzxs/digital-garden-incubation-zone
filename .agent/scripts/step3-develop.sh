#!/bin/bash
# 阶段3: 委派研发 - 06:00
set -e

cd /opt/digital-garden-incubation-zone
DATE=$(date +%Y-%m-%d)
LOG_FILE=".agent/logs/workflow-${DATE}.log"

echo "[$(date +%H:%M:%S)] [阶段3] 委派研发 - 开始" | tee -a "$LOG_FILE"

# 读取当前种子
SEED_NAME=$(cat .agent/ideas/current-seed.txt 2>/dev/null || echo "unknown")
echo "[$(date +%H:%M:%S)] 开发种子: $SEED_NAME" | tee -a "$LOG_FILE"

# 1. 先拉取最新代码（新增步骤）
echo "[$(date +%H:%M:%S)] 拉取最新代码..." | tee -a "$LOG_FILE"
git pull origin main 2>&1 | tee -a "$LOG_FILE" || true

# 2. 委派给 opencode
echo "[$(date +%H:%M:%S)] 执行 opencode run..." | tee -a "$LOG_FILE"

# 构建开发指令
DEVELOP_PROMPT="
你是一个前端创意工程师。请在 ./seeds/${SEED_NAME}/ 目录下开发一个完整的 Web App。

## 产品需求
- 种子名称: ${SEED_NAME}
- 核心交互: 参考创意描述实现高阶微交互
- 审美风格: 流体渐变背景 + 微晶玻璃态容器 + 非线性动效

## 技术规范
1. 免构建优先: Vanilla JS + CSS3 + HTML5
2. 禁止 package.json 和构建流
3. 字体: Inter, Outfit, Share Tech Mono
4. 动效曲线: cubic-bezier(0.16, 1, 0.3, 1)

## 交付物
1. index.html - 完整 HTML 结构
2. style.css - 完整样式（包含背景、容器、动效）
3. main.js - 交互逻辑
4. README.md - 简要说明

## 规范文件
请阅读 .agent/rules/opencode.md 了解详细编码规范。

## 完成后
修改 ./main.js 中的 seeds 数组，添加新种子配置。
"

# 使用 opencode 默认配置（~/.config/opencode/opencode.json）
# 显式指定模型避免恢复旧会话模型
echo "[$(date +%H:%M:%S)] 使用模型: zai-coding-plan/glm-5" | tee -a "$LOG_FILE"
opencode run -m zai-coding-plan/glm-5 "$DEVELOP_PROMPT" 2>&1 | tee -a "$LOG_FILE" || true

# 3. 验证生成
echo "[$(date +%H:%M:%S)] 验证生成文件..." | tee -a "$LOG_FILE"

if [ -f "seeds/${SEED_NAME}/index.html" ]; then
  echo "[$(date +%H:%M:%S)] ✓ index.html 已生成" | tee -a "$LOG_FILE"
else
  echo "[$(date +%H:%M:%S)] ✗ index.html 未生成" | tee -a "$LOG_FILE"
fi

echo "[$(date +%H:%M:%S)] [阶段3] 完成" | tee -a "$LOG_FILE"
