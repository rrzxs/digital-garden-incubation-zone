#!/bin/bash
# 阶段3: 委派研发 - 06:00
set -e

cd /opt/digital-garden-incubation-zone
DATE=$(date +%Y-%m-%d)
LOG_FILE=".agent/logs/workflow-${DATE}.log"
STATUS_DIR=".agent/status"
mkdir -p "$STATUS_DIR"

echo "[$(date +%H:%M:%S)] [阶段3] 委派研发 - 开始" | tee -a "$LOG_FILE"

# 读取当前种子
SEED_NAME=$(cat .agent/ideas/current-seed.txt 2>/dev/null || true)
if [ -z "$SEED_NAME" ]; then
  echo "[$(date +%H:%M:%S)] ✗ 未找到今日 current-seed.txt，阶段3终止" | tee -a "$LOG_FILE"
  exit 1
fi

IDEA_FILE=".agent/ideas/${DATE}-${SEED_NAME}.json"
if [ ! -f "$IDEA_FILE" ]; then
  echo "[$(date +%H:%M:%S)] ✗ 未找到今日创意文件: $IDEA_FILE" | tee -a "$LOG_FILE"
  exit 1
fi

MARKER_FILE="${STATUS_DIR}/${DATE}-${SEED_NAME}.develop.ok"
rm -f "$MARKER_FILE"

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
必须修改根目录 ./seed-config.js 中的 RAW_SEEDS 数组，添加新种子配置。
不要尝试修改不存在的 ./config/seed-config.js。
如果主页展示还依赖 ./main.js 的最小接入，也可以顺手修改，但主注册入口必须是 ./seed-config.js。
"

# 使用 opencode 默认配置（~/.config/opencode/opencode.json）
# 不指定 -m 参数，由全局配置接管模型
if opencode run "$DEVELOP_PROMPT" 2>&1 | tee -a "$LOG_FILE"; then
  OPENCODE_EXIT=0
else
  OPENCODE_EXIT=$?
fi

# 3. 验证生成
echo "[$(date +%H:%M:%S)] 验证生成文件..." | tee -a "$LOG_FILE"

MISSING=0
for file in index.html style.css main.js README.md; do
  if [ -f "seeds/${SEED_NAME}/${file}" ]; then
    echo "[$(date +%H:%M:%S)] ✓ ${file} 已生成" | tee -a "$LOG_FILE"
  else
    echo "[$(date +%H:%M:%S)] ✗ ${file} 未生成" | tee -a "$LOG_FILE"
    MISSING=1
  fi
done

CHANGED_FILES=$(git status --porcelain -- "seeds/${SEED_NAME}" "seed-config.js" "main.js")
if [ -z "$CHANGED_FILES" ]; then
  echo "[$(date +%H:%M:%S)] ✗ 未检测到今日代码变更，拒绝进入部署阶段" | tee -a "$LOG_FILE"
  exit 1
fi

REGISTERED=0
if [ -f "seed-config.js" ] && grep -q "\"${SEED_NAME}\\|/${SEED_NAME}/\\|${SEED_NAME}'\\|${SEED_NAME}\"" seed-config.js; then
  echo "[$(date +%H:%M:%S)] ✓ 已在 seed-config.js 中检测到今日种子注册" | tee -a "$LOG_FILE"
  REGISTERED=1
elif grep -q "\"${SEED_NAME}\\|/${SEED_NAME}/\\|${SEED_NAME}'\\|${SEED_NAME}\"" main.js 2>/dev/null; then
  echo "[$(date +%H:%M:%S)] ✓ 已在 main.js 中检测到今日种子注册" | tee -a "$LOG_FILE"
  REGISTERED=1
else
  echo "[$(date +%H:%M:%S)] ✗ 未检测到今日种子注册信息，拒绝进入部署阶段" | tee -a "$LOG_FILE"
  exit 1
fi

if [ "$OPENCODE_EXIT" -ne 0 ] || [ "$MISSING" -ne 0 ] || [ "$REGISTERED" -ne 1 ]; then
  echo "[$(date +%H:%M:%S)] ✗ 阶段3失败，opencode_exit=${OPENCODE_EXIT} missing=${MISSING} registered=${REGISTERED}" | tee -a "$LOG_FILE"
  exit 1
fi

printf 'seed=%s\ndate=%s\n' "$SEED_NAME" "$DATE" > "$MARKER_FILE"
echo "[$(date +%H:%M:%S)] ✓ 已写入阶段3成功标记: $MARKER_FILE" | tee -a "$LOG_FILE"

echo "[$(date +%H:%M:%S)] [阶段3] 完成" | tee -a "$LOG_FILE"
